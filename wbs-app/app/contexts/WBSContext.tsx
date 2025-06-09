'use client';

import React, { createContext, useReducer, ReactNode } from 'react';
import { Project, WBSTask } from '@/app/lib/types';
import { 
  createEmptyProject, 
  normalizeImportedProject, 
  normalizeWBSTask,
  generateWBSCode,
  deepCopyTasks,
  findTaskById,
  findParentTask,
  calculateEndDate
} from '@/app/lib/wbs-utils';
import { generateSampleProject } from '@/app/lib/sample-data';

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

      return {
        ...state,
        project: {
          ...state.project,
          wbs: addChildToTask(state.project.wbs),
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

      return {
        ...state,
        project: {
          ...state.project,
          wbs: addSiblingToTask(state.project.wbs),
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

      return {
        ...state,
        project: {
          ...state.project,
          wbs: updateTaskInTree(state.project.wbs),
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

      return {
        ...state,
        project: {
          ...state.project,
          wbs: deleteTaskFromTree(state.project.wbs),
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

      return {
        ...state,
        project: {
          ...state.project,
          wbs: duplicateInTree(state.project.wbs),
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

      return {
        ...state,
        project: {
          ...state.project,
          wbs: deleteSelectedTasks(state.project.wbs),
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

      return {
        ...state,
        project: {
          ...state.project,
          wbs: updateSelectedTasks(state.project.wbs),
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
}

export const WBSContext = createContext<WBSContextType | null>(null);

// Provider
interface WBSProviderProps {
  children: ReactNode;
}

export function WBSProvider({ children }: WBSProviderProps) {
  const [state, dispatch] = useReducer(wbsReducer, initialState);

  return (
    <WBSContext.Provider value={{ state, dispatch }}>
      {children}
    </WBSContext.Provider>
  );
} 