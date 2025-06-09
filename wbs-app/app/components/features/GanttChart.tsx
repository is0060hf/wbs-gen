'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { WBSTask } from '@/app/lib/types';
import { flattenTasks } from '@/app/lib/task-utils';
import { calculateEndDate } from '@/app/lib/wbs-utils';
import { useWBS } from '@/app/hooks/useWBS';
import { identifyCriticalPath } from '@/app/lib/task-utils';
import { Calendar, RotateCcw, GitBranch, Zap } from 'lucide-react';

interface GanttChartProps {
  tasks?: WBSTask[];
}

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
  // 日表示のみ
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

  const flatTasks = useMemo(() => flattenTasks(tasks), [tasks]);

  // クリティカルパスの識別
  const criticalPath = useMemo(() => {
    return identifyCriticalPath(tasks);
  }, [tasks]);

  // 日付範囲の計算（日表示用）
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

    // バッファを追加（前後7日）
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);

    return { start: minDate, end: maxDate };
  }, [flatTasks]);

  // 表示用の日付配列を生成（日表示）
  const displayDates = useMemo(() => {
    const dates: Date[] = [];
    const current = new Date(dateRange.start);
    
    while (current <= dateRange.end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1); // 1日ごと
    }
    return dates;
  }, [dateRange]);

  // 日付フォーマット（日表示のみ）
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  // ガントチャート表示定数
  const CHART_CONSTANTS = {
    ROW_HEIGHT: 57,           // タスク行の高さ
    LEFT_OFFSET: 320,         // タスク名エリアの幅
    PADDING: 8,              // パディング
    BAR_VERTICAL_OFFSET: 20,  // タスクバーの垂直オフセット
    DAY_WIDTH_PX: 60,        // 1日の幅
    MIN_TASK_WIDTH_PX: 20,   // タスクの最小幅
    MIN_CHART_WIDTH: 800     // チャート最小幅
  };

  // チャート全体の幅を計算
  const getChartWidth = useCallback((dateCount: number) => {
    return dateCount * CHART_CONSTANTS.DAY_WIDTH_PX;
  }, []);

  // タスクバーの位置とサイズを計算（日表示）
  const getTaskBarStyle = useCallback((task: WBSTask) => {
    const taskStart = new Date(task.start);
    const taskEnd = task.end ? new Date(task.end) : new Date(task.start);
    
    if (displayDates.length === 0) {
      return { left: '0px', width: `${CHART_CONSTANTS.DAY_WIDTH_PX}px` };
    }

    // ガントチャート全体の期間（表示されている範囲）
    const chartStart = new Date(displayDates[0]);
    
    // タスクの開始位置を計算（チャート開始日からの日数）
    const startOffsetDays = (taskStart.getTime() - chartStart.getTime()) / (24 * 60 * 60 * 1000);
    
    // タスクの日数を計算
    const taskDurationDays = Math.max(0.5, (taskEnd.getTime() - taskStart.getTime()) / (24 * 60 * 60 * 1000) + 1);
    
    // タスクの開始位置と幅をピクセルで計算
    const left = startOffsetDays * CHART_CONSTANTS.DAY_WIDTH_PX;
    const width = taskDurationDays * CHART_CONSTANTS.DAY_WIDTH_PX;
    
    // 表示範囲外のタスクの処理
    const maxWidth = getChartWidth(displayDates.length);
    const effectiveLeft = Math.max(0, left);
    const effectiveWidth = Math.min(maxWidth - effectiveLeft, width);
    
    // 最小幅の確保（非常に短いタスクでも見えるように）
    const minWidth = CHART_CONSTANTS.MIN_TASK_WIDTH_PX;
    
    return {
      left: `${effectiveLeft}px`,
      width: `${Math.max(minWidth, effectiveWidth)}px`
    };
  }, [displayDates, getChartWidth]);

  // マウス位置から日付を計算（日表示）
  const getDateFromMousePosition = useCallback((clientX: number) => {
    if (!chartRef.current || displayDates.length === 0) return null;
    
    const rect = chartRef.current.getBoundingClientRect();
    const chartLeft = rect.left + CHART_CONSTANTS.LEFT_OFFSET;
    const relativeX = clientX - chartLeft;
    
    // どの日に該当するかを計算（0.5日単位も考慮）
    const dayIndex = Math.floor(relativeX / CHART_CONSTANTS.DAY_WIDTH_PX);
    const pixelInDay = relativeX % CHART_CONSTANTS.DAY_WIDTH_PX;
    const isHalfDay = pixelInDay >= CHART_CONSTANTS.DAY_WIDTH_PX / 2;
    
    const clampedDayIndex = Math.max(0, Math.min(displayDates.length - 1, dayIndex));
    const baseDate = new Date(displayDates[clampedDayIndex]);
    
    // 0.5日単位で調整
    if (isHalfDay && dayIndex < displayDates.length - 1) {
      baseDate.setHours(12, 0, 0, 0); // 半日を表現
    }
    
    return baseDate;
  }, [displayDates]);

  // ドラッグ開始
  const handleMouseDown = useCallback((e: React.MouseEvent, task: WBSTask, dragType: 'start' | 'end' | 'move') => {
    e.preventDefault();
    setDragState({
      isDragging: true,
      taskId: task.id,
      dragType,
      originalStart: task.start,
      originalEnd: task.end || task.start,
      originalDuration: task.duration_days || 0.5
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
        // 0.5日単位で丸める
        const durationStart = (originalEndDate.getTime() - newDate.getTime()) / (24 * 60 * 60 * 1000) + 1;
        newDuration = Math.max(0.5, Math.round(durationStart * 2) / 2);
        break;
      case 'end':
        newEnd = newDateStr;
        // 0.5日単位で丸める
        const durationEnd = (newDate.getTime() - originalStartDate.getTime()) / (24 * 60 * 60 * 1000) + 1;
        newDuration = Math.max(0.5, Math.round(durationEnd * 2) / 2);
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
        // 0.5日単位で丸める
        const durationStart = (originalEndDate.getTime() - newDate.getTime()) / (24 * 60 * 60 * 1000) + 1;
        updates.duration_days = Math.max(0.5, Math.round(durationStart * 2) / 2);
        break;
      case 'end':
        updates.end = newDateStr;
        // 0.5日単位で丸める
        const durationEnd = (newDate.getTime() - originalStartDate.getTime()) / (24 * 60 * 60 * 1000) + 1;
        updates.duration_days = Math.max(0.5, Math.round(durationEnd * 2) / 2);
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
        return 'opacity-100'; // 完了タスクも完全に表示
      case 'In Progress':
        return 'opacity-90';
      case 'Delayed':
        return 'opacity-100 animate-pulse';
      default:
        return 'opacity-100'; // すべて不透明に
    }
  };

  // ステータスによるパターンクラス（WCAG対応）
  const getStatusPattern = (status?: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-stripes border-2 border-gray-600'; // 斜線パターンとボーダー
      case 'Delayed':
        return 'border-2 border-dashed border-red-600';
      default:
        return '';
    }
  };

  // 現在日のライン位置（日表示）
  const getTodayLinePosition = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 時刻をリセット
    
    if (displayDates.length === 0) return 0;
    
    // 今日がdisplayDatesのどこに位置するかを検索
    const chartStart = new Date(displayDates[0]);
    const chartEnd = new Date(displayDates[displayDates.length - 1]);
    
    if (today < chartStart) return 0;
    if (today > chartEnd) return getChartWidth(displayDates.length);
    
    // 今日の位置を計算（ピクセル単位）
    const daysSinceStart = Math.floor((today.getTime() - chartStart.getTime()) / (24 * 60 * 60 * 1000));
    const position = daysSinceStart * CHART_CONSTANTS.DAY_WIDTH_PX;
    
    return position;
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
    if (!chartRef.current) return '';
    
    // 開始点（前提タスクの終了位置）
    const fromBarStyle = getTaskBarStyle(line.fromTask);
    const fromLeft = parseFloat(fromBarStyle.left.replace('px', ''));
    const fromWidth = parseFloat(fromBarStyle.width.replace('px', ''));
    const fromX = CHART_CONSTANTS.LEFT_OFFSET + fromLeft + fromWidth;
    const fromY = (line.fromIndex + 1) * CHART_CONSTANTS.ROW_HEIGHT + CHART_CONSTANTS.BAR_VERTICAL_OFFSET;

    // 終了点（後続タスクの開始位置）
    const toBarStyle = getTaskBarStyle(line.toTask);
    const toLeft = parseFloat(toBarStyle.left.replace('px', ''));
    const toX = CHART_CONSTANTS.LEFT_OFFSET + toLeft;
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-screen flex flex-col">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">ガントチャート（日表示）</h2>
          <div className="flex items-center gap-2">
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
      <div className="overflow-auto flex-1" ref={chartRef}>
        <div style={{ minWidth: `${Math.max(CHART_CONSTANTS.MIN_CHART_WIDTH, CHART_CONSTANTS.LEFT_OFFSET + getChartWidth(displayDates.length))}px` }}>
          {/* タイムライン ヘッダー */}
          <div className="flex">
            <div className="w-80 flex-shrink-0 bg-gray-50 border-b border-gray-200 p-3">
              <div className="font-medium text-gray-700">タスク</div>
            </div>
            <div className="bg-gray-50 border-b border-gray-200" style={{ width: `${getChartWidth(displayDates.length)}px` }}>
              <div className="flex">
                {displayDates.map((date, index) => (
                  <div
                    key={index}
                    className="p-2 text-xs text-center border-r border-gray-200 last:border-r-0"
                    style={{ width: `${CHART_CONSTANTS.DAY_WIDTH_PX}px` }}
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
              style={{ left: `${320 + getTodayLinePosition()}px` }}
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
                <div className="p-2 relative" style={{ width: `${getChartWidth(displayDates.length)}px` }}>
                  <div className="relative h-6">
                    <div
                      className={`task-bar absolute top-1 h-4 rounded ${getPriorityColor(task)} ${getStatusPattern(task.status)} cursor-move hover:shadow-md transition-all duration-200 ${
                        dragState.isDragging && dragState.taskId === task.id ? 'shadow-lg ring-2 ring-blue-300' : ''
                      }`}
                      style={getTaskBarStyle(task)}
                      onMouseDown={(e) => handleMouseDown(e, task, 'move')}
                      tabIndex={0}
                      role="button"
                      aria-label={`${task.name}: ${task.start}から${task.end}まで。ドラッグして日程変更可能`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          // キーボードでの操作をサポート（将来的な実装）
                        }
                      }}
                    >
                      {/* 左端のリサイズハンドル */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize opacity-0 hover:opacity-100 focus:opacity-100 hover:bg-blue-500 focus:bg-blue-500 rounded-l transition-opacity"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleMouseDown(e, task, 'start');
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label="開始日を変更"
                      />
                      
                      {/* 右端のリサイズハンドル */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize opacity-0 hover:opacity-100 focus:opacity-100 hover:bg-blue-500 focus:bg-blue-500 rounded-r transition-opacity"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleMouseDown(e, task, 'end');
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label="終了日を変更"
                      />

                      {/* 進捗表示 */}
                      {task.progress && task.progress > 0 && (
                        <div
                          className={`h-full rounded-l pointer-events-none ${
                            task.status === 'Completed' 
                              ? 'bg-gray-800 bg-opacity-30' 
                              : 'bg-gray-900 bg-opacity-20'
                          }`}
                          style={{ width: `${task.progress}%` }}
                        />
                      )}
                      
                      {/* 進捗数字表示 */}
                      {task.progress !== undefined && task.progress > 0 && (
                        <div className={`absolute inset-0 flex items-center justify-center text-xs font-bold pointer-events-none ${
                          task.progress > 50 ? 'text-white' : 'text-gray-800'
                        }`}
                        style={{
                          textShadow: task.progress > 50 
                            ? '0 1px 2px rgba(0, 0, 0, 0.8)' 
                            : '0 1px 2px rgba(255, 255, 255, 0.8)'
                        }}>
                          {task.progress}%
                        </div>
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
      <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between text-sm flex-wrap gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-gray-600 font-medium">優先度:</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded" role="img" aria-label="Must優先度"></div>
              <span>Must</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded" role="img" aria-label="Should優先度"></div>
              <span>Should</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded" role="img" aria-label="Could優先度"></div>
              <span>Could</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded" role="img" aria-label="Won't優先度"></div>
              <span>Won't</span>
            </div>
            
            {/* ステータス凡例を追加 */}
            <div className="mx-2 h-4 w-px bg-gray-300"></div>
            <span className="text-gray-600 font-medium">ステータス:</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-3 bg-blue-500 bg-stripes border-2 border-gray-600 rounded" role="img" aria-label="完了ステータス"></div>
              <span>完了</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-3 bg-blue-500 border-2 border-dashed border-red-600 rounded" role="img" aria-label="遅延ステータス"></div>
              <span>遅延</span>
            </div>
            
            {highlightCriticalPath && (
              <>
                <div className="mx-2 h-4 w-px bg-gray-300"></div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-orange-500 to-red-600 rounded border border-orange-300" role="img" aria-label="クリティカルパス"></div>
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