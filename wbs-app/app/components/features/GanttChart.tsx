'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useWBS } from '@/app/hooks/useWBS';
import { WBSTask } from '@/app/lib/types';
import { flattenTasks, identifyCriticalPath } from '@/app/lib/task-utils';
import { calculateEndDate } from '@/app/lib/wbs-utils';
import { Calendar, ZoomIn, ZoomOut, RotateCcw, GitBranch, Zap } from 'lucide-react';

type ViewMode = 'day' | 'week' | 'month';

interface GanttChartProps {
  tasks?: WBSTask[];
}

// ドラッグ状態の型定義
interface DragState {
  isDragging: boolean;
  taskId: string | null;
  dragType: 'start' | 'end' | 'move' | null;
  originalStart: string;
  originalEnd: string;
  originalDuration: number;
}

export function GanttChart({ tasks: propTasks }: GanttChartProps) {
  const { state, dispatch } = useWBS();
  const tasks = propTasks || state.project.wbs;
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDependencies, setShowDependencies] = useState(true);
  const [highlightCriticalPath, setHighlightCriticalPath] = useState(false);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    taskId: null,
    dragType: null,
    originalStart: '',
    originalEnd: '',
    originalDuration: 0
  });
  
  const chartRef = useRef<HTMLDivElement>(null);

  // タスクを平坦化
  const flatTasks = useMemo(() => flattenTasks(tasks), [tasks]);

  // クリティカルパスの識別
  const criticalPath = useMemo(() => {
    return identifyCriticalPath(tasks);
  }, [tasks]);

  // ズーム機能
  const handleZoomIn = useCallback(() => {
    if (viewMode === 'month') {
      setViewMode('week');
    } else if (viewMode === 'week') {
      setViewMode('day');
    } else {
      setZoomLevel(prev => Math.min(prev * 1.5, 3));
    }
  }, [viewMode]);

  const handleZoomOut = useCallback(() => {
    if (viewMode === 'day') {
      setViewMode('week');
    } else if (viewMode === 'week') {
      setViewMode('month');
    } else {
      setZoomLevel(prev => Math.max(prev / 1.5, 0.5));
    }
  }, [viewMode]);

  // 日付範囲の計算（ズームレベルを考慮）
  const dateRange = useMemo(() => {
    if (flatTasks.length === 0) {
      const today = new Date();
      return {
        start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      };
    }

    const taskDates = flatTasks.flatMap(task => [
      new Date(task.start),
      task.end ? new Date(task.end) : new Date(task.start)
    ]);

    const minDate = new Date(Math.min(...taskDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...taskDates.map(d => d.getTime())));

    // バッファを追加（ズームレベルに応じて調整）
    const bufferDays = Math.floor(7 / zoomLevel);
    minDate.setDate(minDate.getDate() - bufferDays);
    maxDate.setDate(maxDate.getDate() + bufferDays);

    return { start: minDate, end: maxDate };
  }, [flatTasks, zoomLevel]);

  // 表示用の日付配列を生成（ズームレベルを考慮）
  const displayDates = useMemo(() => {
    const dates: Date[] = [];
    const current = new Date(dateRange.start);
    
    while (current <= dateRange.end) {
      dates.push(new Date(current));
      switch (viewMode) {
        case 'day':
          current.setDate(current.getDate() + Math.ceil(1 / zoomLevel));
          break;
        case 'week':
          current.setDate(current.getDate() + Math.ceil(7 / zoomLevel));
          break;
        case 'month':
          current.setMonth(current.getMonth() + Math.ceil(1 / zoomLevel));
          break;
      }
    }
    return dates;
  }, [dateRange, viewMode, zoomLevel]);

  // 日付フォーマット
  const formatDate = (date: Date) => {
    switch (viewMode) {
      case 'day':
        return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
      case 'week':
        const weekEnd = new Date(date);
        weekEnd.setDate(date.getDate() + Math.ceil(6 / zoomLevel));
        return `${date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}`;
      case 'month':
        return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short' });
    }
  };

  // タスクバーの位置とサイズを計算
  const getTaskBarStyle = (task: WBSTask) => {
    const taskStart = new Date(task.start);
    const taskEnd = task.end ? new Date(task.end) : new Date(task.start);
    
    const rangeStart = dateRange.start.getTime();
    const rangeEnd = dateRange.end.getTime();
    const rangeDuration = rangeEnd - rangeStart;
    
    const left = ((taskStart.getTime() - rangeStart) / rangeDuration) * 100;
    const width = ((taskEnd.getTime() - taskStart.getTime()) / rangeDuration) * 100;
    
    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.max(1, width)}%`
    };
  };

  // ガントチャート表示定数（ズームレベルを考慮）
  const CHART_CONSTANTS = {
    ROW_HEIGHT: 57,           // タスク行の高さ
    LEFT_OFFSET: 320,         // タスク名エリアの幅
    PADDING: 8,              // パディング
    CHART_WIDTH_MULTIPLIER: 4.8 * zoomLevel,  // チャート幅の倍率（ズームレベル適用）
    BAR_VERTICAL_OFFSET: 20   // タスクバーの垂直オフセット
  };

  // マウス位置から日付を計算
  const getDateFromMousePosition = useCallback((clientX: number) => {
    if (!chartRef.current) return null;
    
    const rect = chartRef.current.getBoundingClientRect();
    const chartLeft = rect.left + CHART_CONSTANTS.LEFT_OFFSET;
    const chartWidth = rect.width - CHART_CONSTANTS.LEFT_OFFSET;
    const relativeX = clientX - chartLeft;
    const percentage = relativeX / chartWidth;
    
    const rangeStart = dateRange.start.getTime();
    const rangeEnd = dateRange.end.getTime();
    const rangeDuration = rangeEnd - rangeStart;
    
    const timestamp = rangeStart + (percentage * rangeDuration);
    return new Date(timestamp);
  }, [dateRange, zoomLevel]);

  // ドラッグ開始
  const handleMouseDown = useCallback((e: React.MouseEvent, task: WBSTask, dragType: 'start' | 'end' | 'move') => {
    e.preventDefault();
    setDragState({
      isDragging: true,
      taskId: task.id,
      dragType,
      originalStart: task.start,
      originalEnd: task.end || task.start,
      originalDuration: task.duration_days || 1
    });
  }, []);

  // ドラッグ中
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging || !dragState.taskId) return;

    const newDate = getDateFromMousePosition(e.clientX);
    if (!newDate) return;

    const newDateStr = newDate.toISOString().split('T')[0];
    const originalStartDate = new Date(dragState.originalStart);
    const originalEndDate = new Date(dragState.originalEnd);

    let newStart = dragState.originalStart;
    let newEnd = dragState.originalEnd;
    let newDuration = dragState.originalDuration;

    switch (dragState.dragType) {
      case 'start':
        newStart = newDateStr;
        newDuration = Math.max(1, Math.ceil((originalEndDate.getTime() - newDate.getTime()) / (24 * 60 * 60 * 1000)) + 1);
        break;
      case 'end':
        newEnd = newDateStr;
        newDuration = Math.max(1, Math.ceil((newDate.getTime() - originalStartDate.getTime()) / (24 * 60 * 60 * 1000)) + 1);
        break;
      case 'move':
        const daysDiff = Math.round((newDate.getTime() - originalStartDate.getTime()) / (24 * 60 * 60 * 1000));
        const newStartDate = new Date(originalStartDate);
        newStartDate.setDate(originalStartDate.getDate() + daysDiff);
        newStart = newStartDate.toISOString().split('T')[0];
        newEnd = calculateEndDate(newStart, dragState.originalDuration);
        newDuration = dragState.originalDuration;
        break;
    }

    // リアルタイムで更新（ローカル状態として表示のみ変更）
    const taskElement = document.querySelector(`[data-task-id="${dragState.taskId}"]`);
    if (taskElement) {
      const tempTask = { ...flatTasks.find(t => t.id === dragState.taskId)!, start: newStart, end: newEnd };
      const style = getTaskBarStyle(tempTask);
      const barElement = taskElement.querySelector('.task-bar') as HTMLElement;
      if (barElement) {
        barElement.style.left = style.left;
        barElement.style.width = style.width;
      }
    }
  }, [dragState, getDateFromMousePosition, flatTasks, getTaskBarStyle]);

  // ドラッグ終了
  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging || !dragState.taskId) return;

    const newDate = getDateFromMousePosition(e.clientX);
    if (!newDate) {
      setDragState({
        isDragging: false,
        taskId: null,
        dragType: null,
        originalStart: '',
        originalEnd: '',
        originalDuration: 0
      });
      return;
    }

    const newDateStr = newDate.toISOString().split('T')[0];
    const originalStartDate = new Date(dragState.originalStart);
    const originalEndDate = new Date(dragState.originalEnd);

    let updates: Partial<WBSTask> = {};

    switch (dragState.dragType) {
      case 'start':
        updates.start = newDateStr;
        updates.duration_days = Math.max(1, Math.ceil((originalEndDate.getTime() - newDate.getTime()) / (24 * 60 * 60 * 1000)) + 1);
        break;
      case 'end':
        updates.end = newDateStr;
        updates.duration_days = Math.max(1, Math.ceil((newDate.getTime() - originalStartDate.getTime()) / (24 * 60 * 60 * 1000)) + 1);
        break;
      case 'move':
        const daysDiff = Math.round((newDate.getTime() - originalStartDate.getTime()) / (24 * 60 * 60 * 1000));
        const newStartDate = new Date(originalStartDate);
        newStartDate.setDate(originalStartDate.getDate() + daysDiff);
        updates.start = newStartDate.toISOString().split('T')[0];
        updates.duration_days = dragState.originalDuration;
        break;
    }

    // タスクを更新
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        taskId: dragState.taskId,
        updates
      }
    });

    setDragState({
      isDragging: false,
      taskId: null,
      dragType: null,
      originalStart: '',
      originalEnd: '',
      originalDuration: 0
    });
  }, [dragState, getDateFromMousePosition, dispatch]);

  // マウスイベントリスナーの設定
  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  // 優先度による色分け（クリティカルパス考慮）
  const getPriorityColor = (task: WBSTask) => {
    // クリティカルパスの場合は特別な色
    if (highlightCriticalPath && criticalPath.has(task.id)) {
      return 'bg-gradient-to-r from-orange-500 to-red-600 border-2 border-orange-300';
    }
    
    switch (task.priority) {
      case 'Must':
        return 'bg-red-500';
      case 'Should':
        return 'bg-yellow-500';
      case 'Could':
        return 'bg-green-500';
      case 'Won\'t':
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
    }
  };

  // ステータスによる透明度
  const getStatusOpacity = (status?: string) => {
    switch (status) {
      case 'Completed':
        return 'opacity-60';
      case 'In Progress':
        return 'opacity-90';
      case 'Delayed':
        return 'opacity-100 animate-pulse';
      default:
        return 'opacity-75';
    }
  };

  // 現在日のライン位置
  const getTodayLinePosition = () => {
    const today = new Date();
    const rangeStart = dateRange.start.getTime();
    const rangeEnd = dateRange.end.getTime();
    const rangeDuration = rangeEnd - rangeStart;
    
    const position = ((today.getTime() - rangeStart) / rangeDuration) * 100;
    return Math.max(0, Math.min(100, position));
  };

  // 依存関係線の描画用データ生成
  const dependencyLines = useMemo(() => {
    if (!showDependencies) return [];
    
    const lines: Array<{
      fromTask: WBSTask;
      toTask: WBSTask;
      fromIndex: number;
      toIndex: number;
    }> = [];

    flatTasks.forEach((task, toIndex) => {
      if (task.dependencies && task.dependencies.length > 0) {
        task.dependencies.forEach(depId => {
          const fromIndex = flatTasks.findIndex(t => t.id === depId);
          if (fromIndex !== -1) {
            lines.push({
              fromTask: flatTasks[fromIndex],
              toTask: task,
              fromIndex,
              toIndex
            });
          }
        });
      }
    });

    return lines;
  }, [flatTasks, showDependencies]);

  // 依存関係線のSVGパス生成
  const generateDependencyPath = (line: typeof dependencyLines[0]) => {
    // 開始点（前提タスクの終了位置）
    const fromBarStyle = getTaskBarStyle(line.fromTask);
    const fromX = CHART_CONSTANTS.LEFT_OFFSET + 
      (parseFloat(fromBarStyle.left.replace('%', '')) + parseFloat(fromBarStyle.width.replace('%', ''))) * 
      CHART_CONSTANTS.CHART_WIDTH_MULTIPLIER;
    const fromY = (line.fromIndex + 1) * CHART_CONSTANTS.ROW_HEIGHT + CHART_CONSTANTS.BAR_VERTICAL_OFFSET;

    // 終了点（後続タスクの開始位置）
    const toBarStyle = getTaskBarStyle(line.toTask);
    const toX = CHART_CONSTANTS.LEFT_OFFSET + 
      parseFloat(toBarStyle.left.replace('%', '')) * CHART_CONSTANTS.CHART_WIDTH_MULTIPLIER;
    const toY = (line.toIndex + 1) * CHART_CONSTANTS.ROW_HEIGHT + CHART_CONSTANTS.BAR_VERTICAL_OFFSET;

    // 中継点を使った滑らかな線
    const midX = (fromX + toX) / 2;
    
    return `M ${fromX} ${fromY} 
            Q ${midX} ${fromY} ${midX} ${(fromY + toY) / 2} 
            Q ${midX} ${toY} ${toX - 8} ${toY}
            L ${toX} ${toY}`;
  };

  const handleReset = () => {
    setCurrentDate(new Date());
    setViewMode('week');
    setZoomLevel(1);
  };

  if (flatTasks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center text-gray-500">
          <Calendar size={64} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">ガントチャート</h3>
          <p>タスクがないため、ガントチャートを表示できません。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">ガントチャート</h2>
          <div className="flex items-center gap-2">
            {/* ビューモード切替 */}
            <div className="flex rounded-md border border-gray-300 overflow-hidden">
              {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 text-sm ${
                    viewMode === mode
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {mode === 'day' ? '日' : mode === 'week' ? '週' : '月'}
                </button>
              ))}
            </div>

            {/* ズーム機能 */}
            <div className="flex rounded-md border border-gray-300 overflow-hidden">
              <button
                onClick={handleZoomOut}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                title="ズームアウト"
              >
                <ZoomOut size={16} />
              </button>
              <div className="px-3 py-2 text-sm bg-gray-50 border-x border-gray-300 min-w-[60px] text-center">
                {Math.round(zoomLevel * 100)}%
              </div>
              <button
                onClick={handleZoomIn}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                title="ズームイン"
              >
                <ZoomIn size={16} />
              </button>
            </div>

            {/* 依存関係線の表示切替 */}
            <button
              onClick={() => setShowDependencies(!showDependencies)}
              className={`p-2 rounded transition-colors ${
                showDependencies
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
              title={showDependencies ? '依存関係線を非表示' : '依存関係線を表示'}
            >
              <GitBranch size={16} />
            </button>

            {/* クリティカルパスハイライト表示切替 */}
            <button
              onClick={() => setHighlightCriticalPath(!highlightCriticalPath)}
              className={`p-2 rounded transition-colors ${
                highlightCriticalPath
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
              title={highlightCriticalPath ? 'クリティカルパスハイライトを非表示' : 'クリティカルパスをハイライト表示'}
            >
              <Zap size={16} />
            </button>
            
            <button
              onClick={handleReset}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
              title="リセット"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ガントチャート本体 */}
      <div className="overflow-x-auto" ref={chartRef}>
        <div className="min-w-[800px]" style={{ minWidth: `${800 * zoomLevel}px` }}>
          {/* タイムライン ヘッダー */}
          <div className="flex">
            <div className="w-80 flex-shrink-0 bg-gray-50 border-b border-gray-200 p-3">
              <div className="font-medium text-gray-700">タスク</div>
            </div>
            <div className="flex-1 bg-gray-50 border-b border-gray-200">
              <div className="flex">
                {displayDates.map((date, index) => (
                  <div
                    key={index}
                    className="flex-1 min-w-[60px] p-2 text-xs text-center border-r border-gray-200 last:border-r-0"
                    style={{ minWidth: `${60 * zoomLevel}px` }}
                  >
                    {formatDate(date)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* タスク行 */}
          <div className="relative">
            {/* 現在日のライン */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
              style={{ left: `calc(320px + ${getTodayLinePosition()}%)` }}
            />

            {/* 依存関係線のSVG */}
            {showDependencies && dependencyLines.length > 0 && (
              <svg
                className="absolute top-0 left-0 w-full h-full pointer-events-none z-5"
                style={{ height: flatTasks.length * CHART_CONSTANTS.ROW_HEIGHT }}
              >
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="8"
                    markerHeight="6"
                    refX="7"
                    refY="3"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 8 3, 0 6"
                      fill="#6b7280"
                      className="opacity-70"
                    />
                  </marker>
                </defs>
                {dependencyLines.map((line, index) => (
                  <path
                    key={index}
                    d={generateDependencyPath(line)}
                    stroke="#6b7280"
                    strokeWidth="2"
                    fill="none"
                    className="opacity-70"
                    markerEnd="url(#arrowhead)"
                  />
                ))}
              </svg>
            )}

            {flatTasks.map((task, index) => (
              <div key={task.id} className="flex border-b border-gray-100 hover:bg-gray-50" data-task-id={task.id}>
                {/* タスク名 */}
                <div className="w-80 flex-shrink-0 p-3 border-r border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{task.wbs_code}</span>
                    <span className="text-sm truncate" title={task.name}>
                      {task.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      task.priority === 'Must' ? 'bg-red-100 text-red-700' :
                      task.priority === 'Should' ? 'bg-yellow-100 text-yellow-700' :
                      task.priority === 'Could' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {task.priority}
                    </span>
                    {task.assignee && (
                      <span className="text-xs text-gray-600">{task.assignee}</span>
                    )}
                  </div>
                </div>

                {/* タスクバー */}
                <div className="flex-1 p-2 relative">
                  <div className="relative h-6">
                    <div
                      className={`task-bar absolute top-1 h-4 rounded ${getPriorityColor(task)} ${getStatusOpacity(task.status)} cursor-move hover:shadow-md transition-all duration-200 ${
                        dragState.isDragging && dragState.taskId === task.id ? 'shadow-lg ring-2 ring-blue-300' : ''
                      }`}
                      style={getTaskBarStyle(task)}
                      onMouseDown={(e) => handleMouseDown(e, task, 'move')}
                    >
                      {/* 左端のリサイズハンドル */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize opacity-0 hover:opacity-100 hover:bg-blue-500 rounded-l transition-opacity"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleMouseDown(e, task, 'start');
                        }}
                      />
                      
                      {/* 右端のリサイズハンドル */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize opacity-0 hover:opacity-100 hover:bg-blue-500 rounded-r transition-opacity"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleMouseDown(e, task, 'end');
                        }}
                      />

                      {/* 進捗表示 */}
                      {task.progress && task.progress > 0 && (
                        <div
                          className="h-full bg-white bg-opacity-40 rounded-l pointer-events-none"
                          style={{ width: `${task.progress}%` }}
                        />
                      )}
                    </div>
                    
                    {/* ホバー時の詳細情報 */}
                    <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-black bg-opacity-75 text-white text-xs p-2 rounded absolute top-6 left-0 z-20 whitespace-nowrap">
                        <div>{task.name}</div>
                        <div>{task.start} ～ {task.end}</div>
                        <div>進捗: {task.progress || 0}%</div>
                        <div className="text-gray-300 text-xs mt-1">
                          ドラッグして日程変更 • 端をドラッグしてリサイズ
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 凡例 */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm flex-wrap gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-gray-600">優先度:</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Must</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>Should</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Could</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded"></div>
              <span>Won't</span>
            </div>
            
            {highlightCriticalPath && (
              <>
                <div className="mx-2 h-4 w-px bg-gray-300"></div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-orange-500 to-red-600 rounded border border-orange-300"></div>
                  <span className="text-orange-700 font-medium">クリティカルパス</span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            {showDependencies && (
              <div className="flex items-center gap-2">
                <GitBranch size={12} className="text-gray-600" />
                <span className="text-gray-600">依存関係</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-4 bg-red-500"></div>
              <span className="text-gray-600">今日</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>💡 タスクバーをドラッグして日程変更可能</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 