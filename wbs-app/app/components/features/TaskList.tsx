'use client';

import { useState, useMemo } from 'react';
import { useWBS } from '@/app/hooks/useWBS';
import { WBSTask } from '@/app/lib/types';
import { ChevronRight, ChevronDown, Plus, Copy, Trash2, MoreVertical, Edit, Expand, Minimize2 } from 'lucide-react';
import { TaskEditModal } from './TaskEditModal';
import { TaskFilter, FilterOptions } from './TaskFilter';
import { filterTasks, getUniqueAssignees, flattenTasks } from '@/app/lib/task-utils';

interface TaskItemProps {
  task: WBSTask;
  level: number;
  isSelected: boolean;
  isExpanded?: boolean;
  onToggleSelect: (taskId: string, isCtrlKey: boolean) => void;
  onToggleExpand?: (taskId: string) => void;
  onEditTask: (taskId: string) => void;
}

function TaskItem({ task, level, isSelected, isExpanded = true, onToggleSelect, onToggleExpand, onEditTask }: TaskItemProps) {
  const { dispatch } = useWBS();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(task.name);
  const [showMenu, setShowMenu] = useState(false);

  const handleNameEdit = () => {
    if (editName.trim() && editName !== task.name) {
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          taskId: task.id,
          updates: { name: editName.trim() }
        }
      });
    }
    setIsEditing(false);
  };

  const handleAddChild = () => {
    dispatch({
      type: 'ADD_CHILD_TASK',
      payload: { parentId: task.id }
    });
    // 子タスク追加時は展開状態にする（親コンポーネントで管理）
    if (onToggleExpand && !isExpanded) {
      onToggleExpand(task.id);
    }
  };

  const handleAddSibling = () => {
    dispatch({
      type: 'ADD_SIBLING_TASK',
      payload: { taskId: task.id }
    });
  };

  const handleDuplicate = () => {
    dispatch({
      type: 'DUPLICATE_TASK',
      payload: { taskId: task.id }
    });
  };

  const handleDelete = () => {
    if (confirm(`タスク「${task.name}」を削除しますか？`)) {
      dispatch({
        type: 'DELETE_TASK',
        payload: { taskId: task.id }
      });
    }
  };

  const indentStyle = { paddingLeft: `${level * 24}px` };

  return (
    <>
      <div
        className={`group flex items-center py-2 px-3 border-b border-gray-200 hover:bg-gray-50 ${
          isSelected ? 'bg-blue-50' : ''
        }`}
        onClick={(e) => onToggleSelect(task.id, e.ctrlKey || e.metaKey)}
      >
        <div className="flex items-center flex-1" style={indentStyle}>
          {task.children && task.children.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleExpand) {
                  onToggleExpand(task.id);
                }
              }}
              className="mr-1 p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          )}
          {(!task.children || task.children.length === 0) && (
            <div className="w-6" />
          )}
          
          <span className="text-xs text-gray-500 mr-2">{task.wbs_code}</span>
          
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleNameEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNameEdit();
                if (e.key === 'Escape') {
                  setEditName(task.name);
                  setIsEditing(false);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <span
              className="flex-1 cursor-text"
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            >
              {task.name}
            </span>
          )}
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditTask(task.id);
              }}
              className="p-1 hover:bg-gray-200 rounded"
              title="詳細編集"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddChild();
              }}
              className="p-1 hover:bg-gray-200 rounded"
              title="子タスクを追加"
            >
              <Plus size={16} />
            </button>
            
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <MoreVertical size={16} />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-8 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddSibling();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    兄弟タスクを追加
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicate();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Copy size={16} />
                    複製
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600 flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    削除
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{task.start}</span>
          <span>{task.duration_days}日</span>
          <span className={`px-2 py-1 rounded text-xs ${
            task.priority === 'Must' ? 'bg-red-100 text-red-700' :
            task.priority === 'Should' ? 'bg-yellow-100 text-yellow-700' :
            task.priority === 'Could' ? 'bg-green-100 text-green-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {task.priority}
          </span>
          <span>{task.assignee || '-'}</span>
          {task.dependencies && task.dependencies.length > 0 && (
            <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs" title="依存関係あり">
              依存: {task.dependencies.length}
            </span>
          )}
        </div>
      </div>
      
      {isExpanded && task.children && task.children.map(child => (
        <TaskItem
          key={child.id}
          task={child}
          level={level + 1}
          isSelected={isSelected}
          isExpanded={onToggleExpand ? undefined : true} // 親で管理されている場合はundefined
          onToggleSelect={onToggleSelect}
          onToggleExpand={onToggleExpand}
          onEditTask={onEditTask}
        />
      ))}
    </>
  );
}

export function TaskList() {
  const { state, dispatch } = useWBS();
  const { wbs } = state.project;
  const { selectedTaskIds } = state;
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    priorities: [],
    statuses: [],
    assignees: [],
    dateRange: 'all',
    showCriticalOnly: false,
    showDelayedOnly: false
  });

  // フィルタリングされたタスクを計算
  const filteredTasks = useMemo(() => {
    return filterTasks(wbs, filters);
  }, [wbs, filters]);

  // 利用可能な担当者一覧を取得
  const availableAssignees = useMemo(() => {
    return getUniqueAssignees(wbs);
  }, [wbs]);

  // 全てのタスクIDを取得（展開/折りたたみ用）
  const allTaskIds = useMemo(() => {
    const flatTasks = flattenTasks(wbs);
    return new Set(flatTasks.filter(task => task.children && task.children.length > 0).map(task => task.id));
  }, [wbs]);

  // デフォルトで全て展開状態で初期化
  useMemo(() => {
    if (allTaskIds.size > 0 && expandedTaskIds.size === 0) {
      setExpandedTaskIds(new Set(allTaskIds));
    }
  }, [allTaskIds, expandedTaskIds.size]);

  const handleAddRootTask = () => {
    dispatch({ type: 'ADD_ROOT_TASK' });
  };

  const handleToggleExpand = (taskId: string) => {
    setExpandedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleExpandAll = () => {
    setExpandedTaskIds(new Set(allTaskIds));
  };

  const handleCollapseAll = () => {
    setExpandedTaskIds(new Set());
  };

  const handleToggleSelect = (taskId: string, isCtrlKey: boolean) => {
    if (isCtrlKey) {
      // Ctrl+クリックで複数選択
      if (selectedTaskIds.includes(taskId)) {
        dispatch({
          type: 'SET_SELECTED_TASKS',
          payload: selectedTaskIds.filter(id => id !== taskId)
        });
      } else {
        dispatch({
          type: 'SET_SELECTED_TASKS',
          payload: [...selectedTaskIds, taskId]
        });
      }
    } else {
      // 通常クリックで単一選択
      dispatch({
        type: 'SET_SELECTED_TASKS',
        payload: [taskId]
      });
    }
  };

  const handleBulkDelete = () => {
    if (selectedTaskIds.length === 0) return;
    
    if (confirm(`選択した${selectedTaskIds.length}個のタスクを削除しますか？`)) {
      dispatch({ type: 'BULK_DELETE_TASKS' });
    }
  };

  return (
    <>
      {/* フィルタリング機能 */}
      <TaskFilter
        filters={filters}
        onFiltersChange={setFilters}
        availableAssignees={availableAssignees}
      />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">タスク一覧</h2>
              {wbs.length !== filteredTasks.length && (
                <p className="text-sm text-gray-600 mt-1">
                  {filteredTasks.length} / {wbs.length} 件のタスクを表示
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExpandAll}
                className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-2"
                title="全て展開"
              >
                <Expand size={16} />
                全て展開
              </button>
              <button
                onClick={handleCollapseAll}
                className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-2"
                title="全て折りたたみ"
              >
                <Minimize2 size={16} />
                全て折りたたみ
              </button>
              <button
                onClick={handleAddRootTask}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
              >
                <Plus size={16} />
                ルートタスクを追加
              </button>
              {selectedTaskIds.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  選択したタスクを削除 ({selectedTaskIds.length})
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="flex items-center py-2 px-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
              <div className="flex-1">タスク名</div>
              <div className="flex items-center gap-4">
                <div className="w-24">開始日</div>
                <div className="w-16">期間</div>
                <div className="w-20">優先度</div>
                <div className="w-24">担当者</div>
              </div>
            </div>
            
            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {wbs.length === 0 
                  ? 'タスクがありません。「ルートタスクを追加」ボタンからタスクを作成してください。'
                  : 'フィルタリング条件に一致するタスクがありません。'}
              </div>
            ) : (
              filteredTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  level={0}
                  isSelected={selectedTaskIds.includes(task.id)}
                  isExpanded={expandedTaskIds.has(task.id)}
                  onToggleSelect={handleToggleSelect}
                  onToggleExpand={handleToggleExpand}
                  onEditTask={setEditingTaskId}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {editingTaskId && (
        <TaskEditModal
          taskId={editingTaskId}
          onClose={() => setEditingTaskId(null)}
        />
      )}
    </>
  );
} 