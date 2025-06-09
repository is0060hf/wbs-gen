import { WBSTask } from './types';
import { FilterOptions } from '@/app/components/features/TaskFilter';

// タスクのフィルタリング
export function filterTasks(tasks: WBSTask[], filters: FilterOptions): WBSTask[] {
  const filtered = tasks.filter(task => {
    // 検索文字列のフィルタリング
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      if (!task.name.toLowerCase().includes(searchLower) &&
          !task.description?.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // 優先度フィルタリング
    if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) {
      return false;
    }

    // ステータスフィルタリング
    if (filters.statuses.length > 0 && !filters.statuses.includes(task.status || 'Not Started')) {
      return false;
    }

    // 担当者フィルタリング
    if (filters.assignees.length > 0 && task.assignee && !filters.assignees.includes(task.assignee)) {
      return false;
    }

    // 期間フィルタリング
    if (filters.dateRange !== 'all') {
      const today = new Date();
      const taskStart = new Date(task.start);
      const taskEnd = task.end ? new Date(task.end) : taskStart;

      switch (filters.dateRange) {
        case 'today':
          const isToday = (
            (taskStart <= today && taskEnd >= today) ||
            taskStart.toDateString() === today.toDateString()
          );
          if (!isToday) return false;
          break;
        case 'thisWeek':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          if (!(taskStart <= weekEnd && taskEnd >= weekStart)) return false;
          break;
        case 'thisMonth':
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          if (!(taskStart <= monthEnd && taskEnd >= monthStart)) return false;
          break;
      }
    }

    // クリティカルパスフィルタリング
    if (filters.showCriticalOnly && !task.is_critical) {
      return false;
    }

    // 遅延タスクフィルタリング
    if (filters.showDelayedOnly) {
      const today = new Date();
      const taskEnd = task.end ? new Date(task.end) : new Date(task.start);
      if (!(task.status !== 'Completed' && taskEnd < today)) {
        return false;
      }
    }

    return true;
  });

  // 子タスクも再帰的にフィルタリング
  return filtered.map(task => ({
    ...task,
    children: task.children ? filterTasks(task.children, filters) : undefined
  }));
}

// 全てのタスクを平坦化（フィルタリング用）
export function flattenTasks(tasks: WBSTask[]): WBSTask[] {
  const result: WBSTask[] = [];
  
  const flatten = (taskList: WBSTask[]) => {
    taskList.forEach(task => {
      result.push(task);
      if (task.children) {
        flatten(task.children);
      }
    });
  };
  
  flatten(tasks);
  return result;
}

// ユニークな担当者一覧を取得
export function getUniqueAssignees(tasks: WBSTask[]): string[] {
  const flatTasks = flattenTasks(tasks);
  const assignees = flatTasks
    .map(task => task.assignee)
    .filter((assignee): assignee is string => !!assignee);
  
  return Array.from(new Set(assignees)).sort();
}

// タスクが遅延しているかチェック
export function isTaskDelayed(task: WBSTask): boolean {
  if (task.status === 'Completed') return false;
  
  const today = new Date();
  const taskEnd = task.end ? new Date(task.end) : new Date(task.start);
  
  return taskEnd < today;
}

// タスクの進捗を計算（子タスクを含む）
export function calculateTaskProgress(task: WBSTask): number {
  if (!task.children || task.children.length === 0) {
    return task.progress || 0;
  }
  
  const childProgresses = task.children.map(child => calculateTaskProgress(child));
  const totalProgress = childProgresses.reduce((sum, progress) => sum + progress, 0);
  
  return Math.round(totalProgress / task.children.length);
}

// クリティカルパスの識別
export function identifyCriticalPath(tasks: WBSTask[]): Set<string> {
  const criticalTasks = new Set<string>();
  const flatTasks = flattenTasks(tasks);
  
  if (flatTasks.length === 0) {
    return criticalTasks;
  }
  
  // 依存関係のマップを作成
  const dependencyMap = new Map<string, string[]>();
  const reverseDependencyMap = new Map<string, string[]>();
  
  flatTasks.forEach(task => {
    dependencyMap.set(task.id, task.dependencies || []);
    task.dependencies?.forEach(depId => {
      if (!reverseDependencyMap.has(depId)) {
        reverseDependencyMap.set(depId, []);
      }
      reverseDependencyMap.get(depId)!.push(task.id);
    });
  });
  
  // 最も遅い終了日を持つタスクから開始
  const taskMap = new Map(flatTasks.map(task => [task.id, task]));
  const latestEndTask: WBSTask = flatTasks.reduce((latest: WBSTask, current: WBSTask) => {
    const latestEnd = latest.end ? new Date(latest.end) : new Date(latest.start);
    const currentEnd = current.end ? new Date(current.end) : new Date(current.start);
    return currentEnd > latestEnd ? current : latest;
  });
  
  // 逆向きにクリティカルパスを辿る
  const visited = new Set<string>();
  const findCriticalPath = (taskId: string) => {
    if (visited.has(taskId)) return;
    visited.add(taskId);
    criticalTasks.add(taskId);
    
    const task = taskMap.get(taskId);
    if (!task || !task.dependencies || task.dependencies.length === 0) return;
    
    // 最も遅い前提タスクを見つける
    let latestDependency: WBSTask | null = null;
    let latestEndDate = new Date(0);
    
    for (const depId of task.dependencies) {
      const depTask = taskMap.get(depId);
      if (depTask) {
        const depEndDate = depTask.end ? new Date(depTask.end) : new Date(depTask.start);
        if (depEndDate > latestEndDate) {
          latestEndDate = depEndDate;
          latestDependency = depTask;
        }
      }
    }
    
    if (latestDependency && latestDependency.id) {
      findCriticalPath(latestDependency.id);
    }
  };
  
  findCriticalPath(latestEndTask.id);
  
  return criticalTasks;
}

// 循環依存の検出
export function detectCircularDependencies(tasks: WBSTask[]): string[] {
  const flatTasks = flattenTasks(tasks);
  const taskMap = new Map(flatTasks.map(task => [task.id, task]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const circularTasks: string[] = [];
  
  const dfs = (taskId: string, path: string[]): boolean => {
    if (visiting.has(taskId)) {
      // 循環を発見
      const cycleStart = path.indexOf(taskId);
      circularTasks.push(...path.slice(cycleStart));
      return true;
    }
    
    if (visited.has(taskId)) {
      return false;
    }
    
    visiting.add(taskId);
    path.push(taskId);
    
    const task = taskMap.get(taskId);
    if (task?.dependencies) {
      for (const depId of task.dependencies) {
        if (dfs(depId, [...path])) {
          return true;
        }
      }
    }
    
    visiting.delete(taskId);
    visited.add(taskId);
    return false;
  };
  
  for (const task of flatTasks) {
    if (!visited.has(task.id)) {
      dfs(task.id, []);
    }
  }
  
  return Array.from(new Set(circularTasks));
}

// 依存関係に基づく日程調整
export function adjustScheduleByDependencies(tasks: WBSTask[]): WBSTask[] {
  const flatTasks = flattenTasks(tasks);
  const taskMap = new Map(flatTasks.map(task => [task.id, task]));
  const updated = new Map<string, WBSTask>();
  
  // トポロジカルソートで依存順序を決定
  const visited = new Set<string>();
  const processing = new Set<string>();
  const sortedTasks: string[] = [];
  
  const topologicalSort = (taskId: string): boolean => {
    if (processing.has(taskId)) return false; // 循環依存
    if (visited.has(taskId)) return true;
    
    processing.add(taskId);
    const task = taskMap.get(taskId);
    
    if (task?.dependencies) {
      for (const depId of task.dependencies) {
        if (!topologicalSort(depId)) return false;
      }
    }
    
    processing.delete(taskId);
    visited.add(taskId);
    sortedTasks.push(taskId);
    return true;
  };
  
  // 全タスクをソート
  for (const task of flatTasks) {
    topologicalSort(task.id);
  }
  
  // 依存順序に基づいて日程を調整
  for (const taskId of sortedTasks) {
    const originalTask = taskMap.get(taskId)!;
    let adjustedTask = { ...originalTask };
    
    if (originalTask.dependencies && originalTask.dependencies.length > 0) {
      // 最も遅い前提タスクの終了日を取得
      let latestEndDate = new Date(originalTask.start);
      
      for (const depId of originalTask.dependencies) {
        const depTask = updated.get(depId) || taskMap.get(depId);
        if (depTask?.end) {
          const depEndDate = new Date(depTask.end);
          depEndDate.setDate(depEndDate.getDate() + 1); // 翌日開始
          if (depEndDate > latestEndDate) {
            latestEndDate = depEndDate;
          }
        }
      }
      
      // 開始日を調整
      const newStartDate = latestEndDate.toISOString().split('T')[0];
      if (newStartDate !== originalTask.start) {
        adjustedTask = {
          ...adjustedTask,
          start: newStartDate,
          end: calculateEndDate(newStartDate, adjustedTask.duration_days)
        };
      }
    }
    
    updated.set(taskId, adjustedTask);
  }
  
  // 元の構造を維持しながら更新されたタスクを適用
  const applyUpdates = (taskList: WBSTask[]): WBSTask[] => {
    return taskList.map(task => {
      const updatedTask = updated.get(task.id) || task;
      return {
        ...updatedTask,
        children: task.children ? applyUpdates(task.children) : undefined
      };
    });
  };
  
  return applyUpdates(tasks);
}

// 終了日計算（既存のwbs-utilsから移植）
function calculateEndDate(start: string, duration: number): string {
  const startDate = new Date(start);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + Math.ceil(duration) - 1);
  return endDate.toISOString().split('T')[0];
}

// 優先度に応じたスタイルクラスを取得するヘルパー関数
export function getPriorityClass(priority: string): string {
  switch (priority) {
    case 'Must':
      return 'bg-red-100 text-red-700';
    case 'Should':
      return 'bg-yellow-100 text-yellow-700';
    case 'Could':
      return 'bg-green-100 text-green-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
} 