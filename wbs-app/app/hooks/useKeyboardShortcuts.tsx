'use client';

import { useEffect } from 'react';
import { useWBS } from './useWBS';

interface KeyboardShortcutsOptions {
  onAddTask?: () => void;
  onExportProject?: () => void;
  onImportProject?: () => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const { state, dispatch, undo, redo, canUndo, canRedo } = useWBS();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // モーダルやフォーム要素がアクティブな場合はスキップ
      const activeElement = document.activeElement;
      const isInputElement = activeElement instanceof HTMLInputElement ||
                           activeElement instanceof HTMLTextAreaElement ||
                           activeElement instanceof HTMLSelectElement ||
                           activeElement?.getAttribute('contenteditable') === 'true';

      // モーダルが開いている場合はスキップ
      const hasOpenModal = document.querySelector('[role="dialog"]') !== null;

      if (isInputElement && !event.ctrlKey && !event.metaKey) {
        return;
      }

      const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;

      // Ctrl/Cmd + キーの組み合わせ
      if (modifierKey) {
        switch (event.key.toLowerCase()) {
          case 'n':
            event.preventDefault();
            if (options.onAddTask) {
              options.onAddTask();
            } else {
              dispatch({ type: 'ADD_ROOT_TASK' });
            }
            break;

          case 's':
            event.preventDefault();
            if (options.onExportProject) {
              options.onExportProject();
            }
            break;

          case 'o':
            event.preventDefault();
            if (options.onImportProject) {
              options.onImportProject();
            }
            break;

          case 'z':
            if (event.shiftKey) {
              // Ctrl/Cmd + Shift + Z: Redo
              event.preventDefault();
              if (canRedo) {
                redo();
              }
            } else {
              // Ctrl/Cmd + Z: Undo
              event.preventDefault();
              if (canUndo) {
                undo();
              }
            }
            break;

          case 'y':
            // Ctrl/Cmd + Y: Redo (Windows style)
            event.preventDefault();
            if (canRedo) {
              redo();
            }
            break;

          case 'a':
            event.preventDefault();
            // 全選択機能（タスクリストビューで有効）
            if (!hasOpenModal) {
              const allTaskIds = getAllTaskIds(state.project.wbs);
              dispatch({
                type: 'SET_SELECTED_TASKS',
                payload: allTaskIds
              });
            }
            break;
        }
      }

      // 単体キー
      if (!modifierKey && !isInputElement && !hasOpenModal) {
        switch (event.key) {
          case 'Delete':
          case 'Backspace':
            event.preventDefault();
            if (state.selectedTaskIds.length > 0) {
              if (confirm(`選択した${state.selectedTaskIds.length}個のタスクを削除しますか？`)) {
                dispatch({ type: 'BULK_DELETE_TASKS' });
              }
            }
            break;

          case 'Escape':
            event.preventDefault();
            // 選択を解除
            dispatch({
              type: 'SET_SELECTED_TASKS',
              payload: []
            });
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dispatch, state.selectedTaskIds, state.project.wbs, options]);

  // ショートカット一覧を表示する関数
  const showShortcuts = () => {
    // クライアントサイドでのみ実行
    if (typeof window === 'undefined') {
      return [];
    }
    
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? 'Cmd' : 'Ctrl';

    const shortcuts = [
      { key: `${modKey} + N`, description: '新規タスク作成' },
      { key: `${modKey} + S`, description: 'プロジェクト保存' },
      { key: `${modKey} + O`, description: 'プロジェクトを開く' },
      { key: `${modKey} + A`, description: '全タスク選択' },
      { key: `${modKey} + Z`, description: '元に戻す' },
      { key: `${modKey} + Y / ${modKey} + Shift + Z`, description: 'やり直し' },
      { key: 'Delete', description: '選択したタスクを削除' },
      { key: 'Escape', description: '選択を解除' }
    ];

    return shortcuts;
  };

  return {
    shortcuts: showShortcuts()
  };
}

// 全タスクIDを取得するヘルパー関数
function getAllTaskIds(tasks: any[]): string[] {
  const ids: string[] = [];
  
  const collectIds = (taskList: any[]) => {
    taskList.forEach(task => {
      ids.push(task.id);
      if (task.children) {
        collectIds(task.children);
      }
    });
  };

  collectIds(tasks);
  return ids;
} 