'use client';

import { useReducer, useCallback } from 'react';
import { Project } from '@/app/lib/types';
import { 
  HistoryState, 
  HistoryAction, 
  HistoryEntry, 
  HistoryActionType,
  createHistoryEntry 
} from '@/app/lib/history-types';

// 履歴の初期状態
const initialHistoryState: HistoryState = {
  entries: [],
  currentIndex: -1, // -1 = 最新状態
  maxEntries: 50
};

// 履歴管理のreducer
function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'ADD_ENTRY': {
      const newEntry: HistoryEntry = {
        ...action.payload,
        id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now()
      };

      // 現在のインデックスが最新でない場合（Undo後の状態）、
      // 現在位置以降の履歴を削除
      const baseEntries = state.currentIndex === -1 
        ? state.entries 
        : state.entries.slice(0, state.currentIndex + 1);

      const newEntries = [...baseEntries, newEntry];

      // 最大エントリ数を超えた場合、古いものを削除
      const trimmedEntries = newEntries.length > state.maxEntries
        ? newEntries.slice(-state.maxEntries)
        : newEntries;

      return {
        ...state,
        entries: trimmedEntries,
        currentIndex: -1 // 最新状態にリセット
      };
    }

    case 'UNDO': {
      if (state.entries.length === 0) return state;
      
      const newIndex = state.currentIndex === -1 
        ? state.entries.length - 2  // 最新から一つ前
        : Math.max(-1, state.currentIndex - 1);

      return {
        ...state,
        currentIndex: newIndex
      };
    }

    case 'REDO': {
      if (state.currentIndex === -1) return state; // 既に最新

      const newIndex = state.currentIndex + 1 >= state.entries.length - 1
        ? -1  // 最新に戻る
        : state.currentIndex + 1;

      return {
        ...state,
        currentIndex: newIndex
      };
    }

    case 'CLEAR_HISTORY': {
      return {
        ...state,
        entries: [],
        currentIndex: -1
      };
    }

    case 'SET_MAX_ENTRIES': {
      const newMaxEntries = action.payload;
      const trimmedEntries = state.entries.length > newMaxEntries
        ? state.entries.slice(-newMaxEntries)
        : state.entries;

      return {
        ...state,
        entries: trimmedEntries,
        maxEntries: newMaxEntries,
        currentIndex: state.currentIndex >= trimmedEntries.length 
          ? -1 
          : state.currentIndex
      };
    }

    default:
      return state;
  }
}

export function useHistory() {
  const [historyState, dispatchHistory] = useReducer(historyReducer, initialHistoryState);

  // 履歴エントリを追加
  const addHistoryEntry = useCallback((
    type: HistoryActionType,
    description: string,
    beforeState: Project,
    afterState: Project,
    metadata?: HistoryEntry['metadata']
  ) => {
    const entry = createHistoryEntry(type, description, beforeState, afterState, metadata);
    dispatchHistory({ type: 'ADD_ENTRY', payload: entry });
  }, []);

  // Undo実行
  const undo = useCallback(() => {
    dispatchHistory({ type: 'UNDO' });
  }, []);

  // Redo実行
  const redo = useCallback(() => {
    dispatchHistory({ type: 'REDO' });
  }, []);

  // 履歴クリア
  const clearHistory = useCallback(() => {
    dispatchHistory({ type: 'CLEAR_HISTORY' });
  }, []);

  // 現在の状態を取得
  const getCurrentState = useCallback((): Project | null => {
    if (historyState.entries.length === 0) return null;
    
    if (historyState.currentIndex === -1) {
      // 最新状態
      return historyState.entries[historyState.entries.length - 1]?.afterState || null;
    } else {
      // 過去の状態
      return historyState.entries[historyState.currentIndex]?.afterState || null;
    }
  }, [historyState.entries, historyState.currentIndex]);

  // Undo/Redo可能かチェック
  const canUndo = historyState.entries.length > 0 && 
    (historyState.currentIndex > 0 || historyState.currentIndex === -1);
  
  const canRedo = historyState.currentIndex !== -1 && 
    historyState.currentIndex < historyState.entries.length - 1;

  // 現在表示すべき状態のインデックス
  const currentDisplayIndex = historyState.currentIndex === -1 
    ? historyState.entries.length - 1 
    : historyState.currentIndex;

  return {
    // 状態
    historyState,
    canUndo,
    canRedo,
    currentDisplayIndex,
    
    // アクション
    addHistoryEntry,
    undo,
    redo,
    clearHistory,
    getCurrentState,
    
    // 設定
    setMaxEntries: (max: number) => dispatchHistory({ type: 'SET_MAX_ENTRIES', payload: max })
  };
} 