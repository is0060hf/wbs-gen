'use client';

import React, { createContext, useReducer, ReactNode, useCallback } from 'react';
import { Project, WBSTask } from '@/app/lib/types';
import { 
  createEmptyProject, 
  normalizeImportedProject, 
  normalizeWBSTask,
  generateWBSCode,
  deepCopyTasks,
  findTaskById,
  findParentTask,
  calculateEndDate,
  recalculateParentTasks,
  isParentTask
} from '@/app/lib/wbs-utils';
import { generateSampleProject } from '@/app/lib/sample-data';
import { useHistory } from '@/app/hooks/useHistory';
import { useToast } from '@/app/hooks/useToast';
import { HistoryActionType } from '@/app/lib/history-types';

// アクションタイプ
type WBSAction =
  | { type: 'CREATE_NEW_PROJECT' }
  | { type: 'IMPORT_PROJECT'; payload: Project }
  | { type: 'LOAD_SAMPLE_PROJECT' }
  | { type: 'UPDATE_PROJECT_INFO'; payload: Partial<Project['project_info']> }
  | { type: 'ADD_ROOT_TASK' }
  | { type: 'ADD_CHILD_TASK'; payload: { parentId: string } }
  | { type: 'ADD_SIBLING_TASK'; payload: { taskId: string } }
  | { type: 'UPDATE_TASK'; payload: { taskId: string; updates: Partial<WBSTask> } }
  | { type: 'DELETE_TASK'; payload: { taskId: string } }
  | { type: 'DUPLICATE_TASK'; payload: { taskId: string } }
  | { type: 'SET_SELECTED_TASKS'; payload: string[] }
  | { type: 'BULK_DELETE_TASKS' }
  | { type: 'BULK_UPDATE_TASKS'; payload: Partial<WBSTask> };

// 状態の型
interface WBSState {
  project: Project;
  selectedTaskIds: string[];
}

// 初期状態
const initialState: WBSState = {
  project: createEmptyProject(),
  selectedTaskIds: []
};

// Reducer
function wbsReducer(state: WBSState, action: WBSAction): WBSState {
  switch (action.type) {
    case 'CREATE_NEW_PROJECT':
      return {
        ...state,
        project: createEmptyProject(),
        selectedTaskIds: []
      };

    case 'IMPORT_PROJECT':
      return {
        ...state,
        project: normalizeImportedProject(action.payload),
        selectedTaskIds: []
      };

    case 'LOAD_SAMPLE_PROJECT':
      return {
        ...state,
        project: generateSampleProject(),
        selectedTaskIds: []
      };

    case 'UPDATE_PROJECT_INFO':
      return {
        ...state,
        project: {
          ...state.project,
          project_info: {
            ...state.project.project_info,
            ...action.payload,
            updated_at: new Date().toISOString().split('T')[0]
          }
        }
      };

    case 'ADD_ROOT_TASK': {
      const newTask = normalizeWBSTask({}, undefined, state.project.wbs.length);
      return {
        ...state,
        project: {
          ...state.project,
          wbs: [...state.project.wbs, newTask],
          project_info: {
            ...state.project.project_info,
            updated_at: new Date().toISOString().split('T')[0]
          }
        }
      };
    }

    case 'ADD_CHILD_TASK': {
      const { parentId } = action.payload;
      const addChildToTask = (tasks: WBSTask[]): WBSTask[] => {
        return tasks.map(task => {
          if (task.id === parentId) {
            const newChild = normalizeWBSTask(
              {},
              task.wbs_code,
              task.children?.length || 0
            );
            return {
              ...task,
              children: [...(task.children || []), newChild]
            };
          }
          if (task.children) {
            return {
              ...task,
              children: addChildToTask(task.children)
            };
          }
          return task;
        });
      };

      const updatedWBS = addChildToTask(state.project.wbs);
      // 親タスクの値を再計算
      const recalculatedWBS = recalculateParentTasks(updatedWBS);

      return {
        ...state,
        project: {
          ...state.project,
          wbs: recalculatedWBS,
          project_info: {
            ...state.project.project_info,
            updated_at: new Date().toISOString().split('T')[0]
          }
        }
      };
    }

    case 'ADD_SIBLING_TASK': {
      const { taskId } = action.payload;
      const addSiblingToTask = (tasks: WBSTask[], parentWBSCode?: string): WBSTask[] => {
        for (let i = 0; i < tasks.length; i++) {
          if (tasks[i].id === taskId) {
            const newTask = normalizeWBSTask(
              {},
              parentWBSCode,
              i + 1
            );
            return [
              ...tasks.slice(0, i + 1),
              newTask,
              ...tasks.slice(i + 1)
            ];
          }
          if (tasks[i].children && tasks[i].children!.length > 0) {
            const updatedChildren = addSiblingToTask(tasks[i].children!, tasks[i].wbs_code);
            if (updatedChildren !== tasks[i].children) {
              return [
                ...tasks.slice(0, i),
                { ...tasks[i], children: updatedChildren },
                ...tasks.slice(i + 1)
              ];
            }
          }
        }
        return tasks;
      };

      // WBSコードを再計算するヘルパー関数
      const recalculateWBSCodes = (tasks: WBSTask[], parentCode?: string): WBSTask[] => {
        return tasks.map((task, index) => {
          const parentCodeForGeneration = parentCode ?? null;
          const newWBSCode = generateWBSCode(parentCodeForGeneration, index);
          return {
            ...task,
            wbs_code: newWBSCode,
            children: task.children ? recalculateWBSCodes(task.children, newWBSCode) : task.children
          };
        });
      };

      const updatedWBS = addSiblingToTask(state.project.wbs);
      const recalculatedWBS = recalculateWBSCodes(updatedWBS);
      // 親タスクの値を再計算
      const finalWBS = recalculateParentTasks(recalculatedWBS);

      return {
        ...state,
        project: {
          ...state.project,
          wbs: finalWBS,
          project_info: {
            ...state.project.project_info,
            updated_at: new Date().toISOString().split('T')[0]
          }
        }
      };
    }

    case 'UPDATE_TASK': {
      const { taskId, updates } = action.payload;
      const updateTaskInTree = (tasks: WBSTask[]): WBSTask[] => {
        return tasks.map(task => {
          if (task.id === taskId) {
            // 親タスクの場合、開始日、期間、進捗率の更新を無視
            if (isParentTask(task)) {
              const filteredUpdates = { ...updates };
              delete filteredUpdates.start;
              delete filteredUpdates.duration_days;
              delete filteredUpdates.end;
              delete filteredUpdates.progress;
              return { ...task, ...filteredUpdates };
            }
            
            const updatedTask = { ...task, ...updates };
            // 期間が変更された場合、終了日を再計算
            if (updates.duration_days !== undefined || updates.start !== undefined) {
              updatedTask.end = calculateEndDate(
                updatedTask.start,
                updatedTask.duration_days
              );
            }
            return updatedTask;
          }
          if (task.children) {
            return {
              ...task,
              children: updateTaskInTree(task.children)
            };
          }
          return task;
        });
      };

      const updatedWBS = updateTaskInTree(state.project.wbs);
      // 親タスクの値を再計算
      const recalculatedWBS = recalculateParentTasks(updatedWBS);

      return {
        ...state,
        project: {
          ...state.project,
          wbs: recalculatedWBS,
          project_info: {
            ...state.project.project_info,
            updated_at: new Date().toISOString().split('T')[0]
          }
        }
      };
    }

    case 'DELETE_TASK': {
      const { taskId } = action.payload;
      const deleteTaskFromTree = (tasks: WBSTask[]): WBSTask[] => {
        return tasks
          .filter(task => task.id !== taskId)
          .map(task => {
            if (task.children) {
              return {
                ...task,
                children: deleteTaskFromTree(task.children)
              };
            }
            return task;
          });
      };

      const updatedWBS = deleteTaskFromTree(state.project.wbs);
      // 親タスクの値を再計算
      const recalculatedWBS = recalculateParentTasks(updatedWBS);

      return {
        ...state,
        project: {
          ...state.project,
          wbs: recalculatedWBS,
          project_info: {
            ...state.project.project_info,
            updated_at: new Date().toISOString().split('T')[0]
          }
        },
        selectedTaskIds: state.selectedTaskIds.filter(id => id !== taskId)
      };
    }

    case 'DUPLICATE_TASK': {
      const { taskId } = action.payload;
      const duplicateTask = (task: WBSTask): WBSTask => {
        const newTask = normalizeWBSTask({
          ...task,
          id: undefined, // 新しいIDを生成させる
          name: `${task.name} (コピー)`,
          children: task.children?.map(child => duplicateTask(child))
        });
        return newTask;
      };

      const duplicateInTree = (tasks: WBSTask[]): WBSTask[] => {
        const result: WBSTask[] = [];
        for (const task of tasks) {
          result.push(task);
          if (task.id === taskId) {
            result.push(duplicateTask(task));
          } else if (task.children) {
            result[result.length - 1] = {
              ...task,
              children: duplicateInTree(task.children)
            };
          }
        }
        return result;
      };

      const updatedWBS = duplicateInTree(state.project.wbs);
      // 親タスクの値を再計算
      const recalculatedWBS = recalculateParentTasks(updatedWBS);

      return {
        ...state,
        project: {
          ...state.project,
          wbs: recalculatedWBS,
          project_info: {
            ...state.project.project_info,
            updated_at: new Date().toISOString().split('T')[0]
          }
        }
      };
    }

    case 'SET_SELECTED_TASKS':
      return {
        ...state,
        selectedTaskIds: action.payload
      };

    case 'BULK_DELETE_TASKS': {
      const deleteSelectedTasks = (tasks: WBSTask[]): WBSTask[] => {
        return tasks
          .filter(task => !state.selectedTaskIds.includes(task.id))
          .map(task => {
            if (task.children) {
              return {
                ...task,
                children: deleteSelectedTasks(task.children)
              };
            }
            return task;
          });
      };

      const updatedWBS = deleteSelectedTasks(state.project.wbs);
      // 親タスクの値を再計算
      const recalculatedWBS = recalculateParentTasks(updatedWBS);

      return {
        ...state,
        project: {
          ...state.project,
          wbs: recalculatedWBS,
          project_info: {
            ...state.project.project_info,
            updated_at: new Date().toISOString().split('T')[0]
          }
        },
        selectedTaskIds: []
      };
    }

    case 'BULK_UPDATE_TASKS': {
      const updates = action.payload;
      const updateSelectedTasks = (tasks: WBSTask[]): WBSTask[] => {
        return tasks.map(task => {
          if (state.selectedTaskIds.includes(task.id)) {
            // 親タスクの場合、開始日、期間、進捗率の更新を無視
            if (isParentTask(task)) {
              const filteredUpdates = { ...updates };
              delete filteredUpdates.start;
              delete filteredUpdates.duration_days;
              delete filteredUpdates.end;
              delete filteredUpdates.progress;
              return { ...task, ...filteredUpdates };
            }
            
            const updatedTask = { ...task, ...updates };
            // 期間が変更された場合、終了日を再計算
            if (updates.duration_days !== undefined || updates.start !== undefined) {
              updatedTask.end = calculateEndDate(
                updatedTask.start,
                updatedTask.duration_days
              );
            }
            return updatedTask;
          }
          if (task.children) {
            return {
              ...task,
              children: updateSelectedTasks(task.children)
            };
          }
          return task;
        });
      };

      const updatedWBS = updateSelectedTasks(state.project.wbs);
      // 親タスクの値を再計算
      const recalculatedWBS = recalculateParentTasks(updatedWBS);

      return {
        ...state,
        project: {
          ...state.project,
          wbs: recalculatedWBS,
          project_info: {
            ...state.project.project_info,
            updated_at: new Date().toISOString().split('T')[0]
          }
        }
      };
    }

    default:
      return state;
  }
}

// Context
interface WBSContextType {
  state: WBSState;
  dispatch: React.Dispatch<WBSAction>;
  // 履歴管理
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  // トースト通知
  showToast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
    successWithUndo: (title: string, message?: string, onUndo?: () => void) => void;
  };
  // トースト状態
  toasts: ReturnType<typeof useToast>['toasts'];
  removeToast: (id: string) => void;
}

export const WBSContext = createContext<WBSContextType | null>(null);

// Provider
interface WBSProviderProps {
  children: ReactNode;
}

export function WBSProvider({ children }: WBSProviderProps) {
  const [state, dispatch] = useReducer(wbsReducer, initialState);
  const history = useHistory();
  const toast = useToast();

  // 履歴付きのdispatch関数
  const dispatchWithHistory = useCallback((action: WBSAction) => {
    // アクション実行前の状態を保存（Deep cloneで安全にコピー）
    const beforeState = JSON.parse(JSON.stringify(state.project));
    
    // アクションを実行
    dispatch(action);
    
    // 次のレンダリングサイクルで履歴エントリを作成
    setTimeout(() => {
      // アクション実行後の状態を取得（最新のstateを参照する必要があるため）
      const currentState = JSON.parse(JSON.stringify(state.project));
      let historyType: HistoryActionType;
      let description: string;
      let metadata: any = {};

      switch (action.type) {
        case 'CREATE_NEW_PROJECT':
          historyType = 'CREATE_PROJECT';
          description = '新規プロジェクトを作成しました';
          break;
        case 'IMPORT_PROJECT':
          historyType = 'IMPORT_PROJECT';
          description = 'プロジェクトをインポートしました';
          break;
        case 'UPDATE_PROJECT_INFO':
          historyType = 'UPDATE_PROJECT_INFO';
          description = 'プロジェクト情報を更新しました';
          break;
        case 'ADD_ROOT_TASK':
        case 'ADD_CHILD_TASK':
        case 'ADD_SIBLING_TASK':
          historyType = 'ADD_TASK';
          description = 'タスクを追加しました';
          break;
        case 'UPDATE_TASK':
          historyType = 'UPDATE_TASK';
          description = 'タスクを更新しました';
          metadata.taskIds = [action.payload.taskId];
          break;
        case 'DELETE_TASK':
          historyType = 'DELETE_TASK';
          description = 'タスクを削除しました';
          metadata.taskIds = [action.payload.taskId];
          break;
        case 'BULK_DELETE_TASKS':
          historyType = 'BULK_DELETE';
          description = `${state.selectedTaskIds.length}個のタスクを削除しました`;
          metadata.affectedCount = state.selectedTaskIds.length;
          break;
        case 'BULK_UPDATE_TASKS':
          historyType = 'BULK_UPDATE';
          description = `${state.selectedTaskIds.length}個のタスクを更新しました`;
          metadata.affectedCount = state.selectedTaskIds.length;
          break;
        default:
          return; // 履歴に記録しないアクション
      }

      history.addHistoryEntry(historyType, description, beforeState, currentState, metadata);
    }, 0);
  }, [state.project, state.selectedTaskIds, history]);

  // Undo実行時の処理
  const handleUndo = useCallback(() => {
    const historyState = history.getCurrentState();
    if (historyState) {
      // 直接stateを更新（履歴に記録しない）
      dispatch({ type: 'IMPORT_PROJECT', payload: historyState });
      history.undo();
      toast.info('操作を元に戻しました');
    }
  }, [history, toast]);

  // Redo実行時の処理
  const handleRedo = useCallback(() => {
    history.redo();
    const historyState = history.getCurrentState();
    if (historyState) {
      dispatch({ type: 'IMPORT_PROJECT', payload: historyState });
      toast.info('操作をやり直しました');
    }
  }, [history, toast]);

  // トースト通知のヘルパー
  const showToast = {
    success: (title: string, message?: string) => toast.success(title, message),
    error: (title: string, message?: string) => toast.error(title, message),
    warning: (title: string, message?: string) => toast.warning(title, message),
    info: (title: string, message?: string) => toast.info(title, message),
    successWithUndo: (title: string, message?: string, onUndo?: () => void) => 
      toast.successWithUndo(title, message, onUndo)
  };

  const contextValue: WBSContextType = {
    state,
    dispatch: dispatchWithHistory,
    // 履歴管理
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    undo: handleUndo,
    redo: handleRedo,
    clearHistory: history.clearHistory,
    // トースト通知
    showToast,
    toasts: toast.toasts,
    removeToast: toast.removeToast
  };

  return (
    <WBSContext.Provider value={contextValue}>
      {children}
    </WBSContext.Provider>
  );
} 