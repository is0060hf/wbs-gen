'use client';

import { useState } from 'react';
import { useWBS } from '@/app/hooks/useWBS';
import { History, Undo, Redo, Trash2, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { HistoryEntry } from '@/app/lib/history-types';

export function HistoryPanel() {
  const { canUndo, canRedo, undo, redo, clearHistory } = useWBS();
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const getActionIcon = (type: HistoryEntry['type']) => {
    switch (type) {
      case 'CREATE_PROJECT':
        return '📁';
      case 'IMPORT_PROJECT':
        return '📂';
      case 'ADD_TASK':
        return '➕';
      case 'UPDATE_TASK':
        return '✏️';
      case 'DELETE_TASK':
        return '🗑️';
      case 'BULK_UPDATE':
        return '📝';
      case 'BULK_DELETE':
        return '🗑️';
      default:
        return '⚙️';
    }
  };

  return (
    <div className="bg-white border rounded-lg shadow-sm">
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">操作履歴</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={!canUndo}
              className={`p-1.5 rounded transition-colors ${
                canUndo 
                  ? 'text-blue-600 hover:bg-blue-50' 
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="元に戻す (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className={`p-1.5 rounded transition-colors ${
                canRedo 
                  ? 'text-blue-600 hover:bg-blue-50' 
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="やり直し (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-gray-500 hover:bg-gray-50 rounded transition-colors"
              title={isExpanded ? '履歴を非表示' : '履歴を表示'}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500">
              最近の操作
            </span>
            <button
              onClick={clearHistory}
              className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
              title="履歴をクリア"
            >
              <Trash2 className="w-3 h-3" />
              クリア
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {/* 履歴がない場合のメッセージ */}
            <div className="text-center py-4 text-gray-400 text-sm">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>操作履歴はありません</p>
              <p className="text-xs mt-1">操作を行うと履歴が表示されます</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

 