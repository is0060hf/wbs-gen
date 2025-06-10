import { WBSTask, Project, ProjectInfo } from './types';

// 終了日の計算
export function calculateEndDate(start: string, duration: number): string {
  const startDate = new Date(start);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + Math.ceil(duration) - 1);
  return endDate.toISOString().split('T')[0];
}

// タスクID生成
export function generateTaskId(): string {
  return `T-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// WBSコード生成
export function generateWBSCode(parentCode: string | null, siblingCount: number): string {
  if (!parentCode) {
    return `${siblingCount + 1}`;
  }
  return `${parentCode}.${siblingCount + 1}`;
}

// タスクの正規化
export function normalizeWBSTask(task: Partial<WBSTask>, parentWBSCode?: string, siblingIndex?: number): WBSTask {
  // デフォルト値の設定
  const normalized: WBSTask = {
    id: task.id || generateTaskId(),
    wbs_code: task.wbs_code || generateWBSCode(parentWBSCode || null, siblingIndex || 0),
    name: task.name || '新規タスク',
    priority: task.priority || 'Must',
    start: task.start || new Date().toISOString().split('T')[0],
    duration_days: task.duration_days || 1,
    
    // オプショナルフィールドのデフォルト値
    progress: task.progress ?? 0,
    status: task.status ?? 'Not Started',
    dependencies: task.dependencies || [],
    
    // 終了日の処理（値があれば使用、なければ計算）
    end: task.end || calculateEndDate(task.start || new Date().toISOString().split('T')[0], task.duration_days || 1),
    
    // その他のオプショナルフィールド
    description: task.description,
    assignee: task.assignee,
    buffer: task.buffer,
    is_critical: task.is_critical ?? false,
    notes: task.notes,
    
    // 子タスクの再帰処理
    children: task.children?.map((child, index) => normalizeWBSTask(child, task.wbs_code || '1', index))
  };

  return normalized;
}

// インポート時の正規化処理
export function normalizeImportedProject(data: any): Project {
  // project_infoの正規化
  const projectInfo: ProjectInfo = {
    name: data.project_info?.name || 'インポートされたプロジェクト',
    version: data.project_info?.version || '1.0.0',
    pmbok_version: data.project_info?.pmbok_version || '7',
    description: data.project_info?.description || '',
    created_at: data.project_info?.created_at || new Date().toISOString().split('T')[0],
    updated_at: data.project_info?.updated_at || new Date().toISOString().split('T')[0]
  };

  // WBSタスクの正規化
  const wbs = (data.wbs || []).map((task: any, index: number) => normalizeWBSTask(task, undefined, index));

  return {
    project_info: projectInfo,
    wbs: wbs
  };
}

// 空のプロジェクトを作成
export function createEmptyProject(): Project {
  return {
    project_info: {
      name: '新規プロジェクト',
      version: '1.0.0',
      pmbok_version: '7',
      description: '',
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0]
    },
    wbs: []
  };
}

// タスクを検索（IDベース）
export function findTaskById(tasks: WBSTask[], id: string): WBSTask | null {
  for (const task of tasks) {
    if (task.id === id) return task;
    if (task.children) {
      const found = findTaskById(task.children, id);
      if (found) return found;
    }
  }
  return null;
}

// タスクの親を検索
export function findParentTask(tasks: WBSTask[], targetId: string): WBSTask | null {
  for (const task of tasks) {
    if (task.children) {
      if (task.children.some(child => child.id === targetId)) {
        return task;
      }
      const found = findParentTask(task.children, targetId);
      if (found) return found;
    }
  }
  return null;
}

// タスクツリーのディープコピー
export function deepCopyTasks(tasks: WBSTask[]): WBSTask[] {
  return JSON.parse(JSON.stringify(tasks));
}

// 親タスクかどうかを判定
export function isParentTask(task: WBSTask): boolean {
  return !!(task.children && task.children.length > 0);
}

// 親タスクの値を子タスクから計算
export function calculateParentTaskValues(task: WBSTask): { start: string; duration_days: number; end: string; progress: number } {
  if (!isParentTask(task) || !task.children || task.children.length === 0) {
    return {
      start: task.start,
      duration_days: task.duration_days,
      end: task.end || calculateEndDate(task.start, task.duration_days),
      progress: task.progress || 0
    };
  }

  // 子タスクの開始日と終了日を取得
  let earliestStart: Date | null = null;
  let latestEnd: Date | null = null;
  let totalProgress = 0;
  let totalDuration = 0;

  task.children.forEach(child => {
    // 子タスクが親タスクの場合は再帰的に計算
    let childStart: string;
    let childEnd: string;
    let childDuration: number;
    let childProgress: number;
    
    if (isParentTask(child)) {
      const parentValues = calculateParentTaskValues(child);
      childStart = parentValues.start;
      childEnd = parentValues.end;
      childDuration = parentValues.duration_days;
      childProgress = parentValues.progress;
    } else {
      childStart = child.start;
      childEnd = child.end || calculateEndDate(child.start, child.duration_days);
      childDuration = child.duration_days;
      childProgress = child.progress || 0;
    }
    
    const startDate = new Date(childStart);
    const endDate = new Date(childEnd);
    
    if (!earliestStart || startDate < earliestStart) {
      earliestStart = startDate;
    }
    if (!latestEnd || endDate > latestEnd) {
      latestEnd = endDate;
    }
    
    // 進捗率の計算（期間で重み付け）
    totalDuration += childDuration;
    totalProgress += childProgress * childDuration;
  });

  if (!earliestStart || !latestEnd) {
    return {
      start: task.start,
      duration_days: task.duration_days,
      end: task.end || calculateEndDate(task.start, task.duration_days),
      progress: task.progress || 0
    };
  }

  // 期間を計算（日数） - 0.5日単位で丸める
  const durationInMs = (latestEnd as Date).getTime() - (earliestStart as Date).getTime();
  const durationDays = Math.round((durationInMs / (24 * 60 * 60 * 1000) + 1) * 2) / 2;

  // 加重平均で進捗率を計算
  const averageProgress = totalDuration > 0 ? Math.round(totalProgress / totalDuration) : 0;

  return {
    start: (earliestStart as Date).toISOString().split('T')[0],
    duration_days: durationDays,
    end: (latestEnd as Date).toISOString().split('T')[0],
    progress: averageProgress
  };
}

// タスクツリー全体の親タスクを再計算
export function recalculateParentTasks(tasks: WBSTask[]): WBSTask[] {
  return tasks.map(task => {
    if (isParentTask(task)) {
      // 子タスクを先に再帰的に処理
      const updatedChildren = task.children ? recalculateParentTasks(task.children) : [];
      const updatedTask = { ...task, children: updatedChildren };
      
      // 親タスクの値を計算
      const parentValues = calculateParentTaskValues(updatedTask);
      
      return {
        ...updatedTask,
        start: parentValues.start,
        duration_days: parentValues.duration_days,
        end: parentValues.end,
        progress: parentValues.progress
      };
    }
    return task;
  });
}

// タスクが別のタスクの子孫かどうかを確認
export function isDescendantOf(task: WBSTask, ancestorId: string): boolean {
  if (task.id === ancestorId) return true;
  
  if (task.children) {
    for (const child of task.children) {
      if (isDescendantOf(child, ancestorId)) {
        return true;
      }
    }
  }
  
  return false;
}

// WBSコードを再計算する
export function recalculateWBSCodes(tasks: WBSTask[], parentCode?: string): WBSTask[] {
  return tasks.map((task, index) => {
    const parentCodeForGeneration = parentCode ?? null;
    const newWBSCode = generateWBSCode(parentCodeForGeneration, index);
    return {
      ...task,
      wbs_code: newWBSCode,
      children: task.children ? recalculateWBSCodes(task.children, newWBSCode) : task.children
    };
  });
} 