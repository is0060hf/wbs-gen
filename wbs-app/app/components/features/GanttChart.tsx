'use client';

import { useState, useMemo } from 'react';
import { useWBS } from '@/app/hooks/useWBS';
import { WBSTask } from '@/app/lib/types';
import { flattenTasks } from '@/app/lib/task-utils';
import { Calendar, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

type ViewMode = 'day' | 'week' | 'month';

interface GanttChartProps {
  tasks?: WBSTask[];
}

export function GanttChart({ tasks: propTasks }: GanttChartProps) {
  const { state } = useWBS();
  const tasks = propTasks || state.project.wbs;
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  // タスクを平坦化
  const flatTasks = useMemo(() => flattenTasks(tasks), [tasks]);

  // 日付範囲の計算
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

    // バッファを追加
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);

    return { start: minDate, end: maxDate };
  }, [flatTasks]);

  // 表示用の日付配列を生成
  const displayDates = useMemo(() => {
    const dates: Date[] = [];
    const current = new Date(dateRange.start);
    
    while (current <= dateRange.end) {
      dates.push(new Date(current));
      switch (viewMode) {
        case 'day':
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }
    return dates;
  }, [dateRange, viewMode]);

  // 日付フォーマット
  const formatDate = (date: Date) => {
    switch (viewMode) {
      case 'day':
        return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
      case 'week':
        const weekEnd = new Date(date);
        weekEnd.setDate(date.getDate() + 6);
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

  // 優先度による色分け
  const getPriorityColor = (priority: string) => {
    switch (priority) {
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

  const handleReset = () => {
    setCurrentDate(new Date());
    setViewMode('week');
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
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
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

            {flatTasks.map((task, index) => (
              <div key={task.id} className="flex border-b border-gray-100 hover:bg-gray-50">
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
                      className={`absolute top-1 h-4 rounded ${getPriorityColor(task.priority)} ${getStatusOpacity(task.status)}`}
                      style={getTaskBarStyle(task)}
                    >
                      {/* 進捗表示 */}
                      {task.progress && task.progress > 0 && (
                        <div
                          className="h-full bg-white bg-opacity-40 rounded-l"
                          style={{ width: `${task.progress}%` }}
                        />
                      )}
                    </div>
                    
                    {/* ホバー時の詳細情報 */}
                    <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity">
                      <div className="bg-black bg-opacity-75 text-white text-xs p-2 rounded absolute top-6 left-0 z-20 whitespace-nowrap">
                        <div>{task.name}</div>
                        <div>{task.start} ～ {task.end}</div>
                        <div>進捗: {task.progress || 0}%</div>
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
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
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
          </div>
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-4 bg-red-500"></div>
            <span className="text-gray-600">今日</span>
          </div>
        </div>
      </div>
    </div>
  );
} 