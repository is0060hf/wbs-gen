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