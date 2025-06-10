import { Project, WBSTask } from './types';

// 操作履歴のアクション種別
export type HistoryActionType = 
  | 'CREATE_PROJECT'
  | 'UPDATE_PROJECT_INFO'
  | 'ADD_TASK'
  | 'UPDATE_TASK'
  | 'DELETE_TASK'
  | 'MOVE_TASK'
  | 'BULK_UPDATE'
  | 'BULK_DELETE'
  | 'IMPORT_PROJECT';

// 操作履歴エントリ
export interface HistoryEntry {
  id: string;
  type: HistoryActionType;
  description: string;
  timestamp: number;
  beforeState: Project;
  afterState: Project;
  metadata?: {
    taskIds?: string[];
    taskNames?: string[];
    affectedCount?: number;
    taskId?: string;
    targetId?: string;
    position?: 'before' | 'after' | 'inside';
  };
}

// 履歴管理の状態
export interface HistoryState {
  entries: HistoryEntry[];
  currentIndex: number; // -1 = 最新状態, 0以上 = 過去の状態
  maxEntries: number;
}

// 履歴アクション
export type HistoryAction =
  | { type: 'ADD_ENTRY'; payload: Omit<HistoryEntry, 'id' | 'timestamp'> }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'SET_MAX_ENTRIES'; payload: number };

// 履歴エントリ生成のヘルパー
export function createHistoryEntry(
  type: HistoryActionType,
  description: string,
  beforeState: Project,
  afterState: Project,
  metadata?: HistoryEntry['metadata']
): Omit<HistoryEntry, 'id' | 'timestamp'> {
  return {
    type,
    description,
    beforeState: JSON.parse(JSON.stringify(beforeState)), // Deep clone
    afterState: JSON.parse(JSON.stringify(afterState)),   // Deep clone
    metadata
  };
} 