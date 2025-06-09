'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useWBS } from '@/app/hooks/useWBS';
import { WBSTask } from '@/app/lib/types';
import { ChevronRight, ChevronDown, Plus, Copy, Trash2, MoreVertical, Edit, Settings, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { TaskEditModal } from './TaskEditModal';
import { TaskFilter, FilterOptions } from './TaskFilter';
import { filterTasks, getUniqueAssignees, flattenTasks, getPriorityClass } from '@/app/lib/task-utils';

// カラム定義
interface Column {
  id: string;
  name: string;
  visible: boolean;
  width: number;
  sortable: boolean;
}

const defaultColumns: Column[] = [
  { id: 'wbs_code', name: 'WBSコード', visible: true, width: 100, sortable: true },
  { id: 'name', name: 'タスク名', visible: true, width: 300, sortable: true },
  { id: 'start', name: '開始日', visible: true, width: 100, sortable: true },
  { id: 'duration_days', name: '期間', visible: true, width: 80, sortable: true },
  { id: 'priority', name: '優先度', visible: true, width: 100, sortable: true },
  { id: 'assignee', name: '担当者', visible: true, width: 120, sortable: true },
  { id: 'dependencies', name: '依存関係', visible: true, width: 100, sortable: false },
  { id: 'end', name: '終了日', visible: false, width: 100, sortable: true },
  { id: 'progress', name: '進捗', visible: false, width: 80, sortable: true },
  { id: 'status', name: 'ステータス', visible: false, width: 100, sortable: true },
];

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  columnId: string;
  direction: SortDirection;
}

// 定数定義
const TABLE_MAX_HEIGHT = 'calc(100vh - 300px)';

interface TaskActionsProps {
  task: WBSTask;
  isExpanded?: boolean;
  onToggleExpand?: (taskId: string) => void;
  onEditTask: (taskId: string) => void;
}

function TaskActions({ task, isExpanded, onToggleExpand, onEditTask }: TaskActionsProps) {
  const { dispatch } = useWBS();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      setShowMenu(false); // アンマウント時にメニューを閉じる
    };
  }, [showMenu]);

  const handleAddChild = () => {
    dispatch({
      type: 'ADD_CHILD_TASK',
      payload: { parentId: task.id }
    });
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

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
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
      
      <div className="relative" ref={menuRef}>
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
  );
}

interface ColumnSettingsProps {
  columns: Column[];
  onColumnsChange: (columns: Column[]) => void;
  onClose: () => void;
}

function ColumnSettings({ columns, onColumnsChange, onClose }: ColumnSettingsProps) {
  const [localColumns, setLocalColumns] = useState(columns);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const draggedColumn = localColumns[dragItem.current];
      const newColumns = [...localColumns];
      newColumns.splice(dragItem.current, 1);
      newColumns.splice(dragOverItem.current, 0, draggedColumn);
      setLocalColumns(newColumns);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleToggleColumn = (columnId: string) => {
    const newColumns = localColumns.map(col =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    setLocalColumns(newColumns);
  };

  const handleApply = () => {
    onColumnsChange(localColumns);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">カラム設定</h3>
        
        <div className="space-y-2">
          {localColumns.map((column, index) => (
            <div
              key={column.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              className="flex items-center justify-between p-2 border rounded cursor-move hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={column.visible}
                  onChange={() => handleToggleColumn(column.id)}
                  className="h-4 w-4"
                />
                <span>{column.name}</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            適用
          </button>
        </div>
      </div>
    </div>
  );
}

interface TaskRowProps {
  task: WBSTask;
  level: number;
  columns: Column[];
  isSelected: boolean;
  isExpanded?: boolean;
  selectedTaskIds: string[];
  expandedTaskIds?: Set<string>;
  onToggleSelect: (taskId: string, isCtrlKey: boolean) => void;
  onToggleExpand?: (taskId: string) => void;
  onEditTask: (taskId: string) => void;
}

function TaskRow({ task, level, columns, isSelected, isExpanded = true, selectedTaskIds, expandedTaskIds, onToggleSelect, onToggleExpand, onEditTask }: TaskRowProps) {
  const { dispatch } = useWBS();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(task.name);

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

  const getCellContent = (columnId: string) => {
    switch (columnId) {
      case 'wbs_code':
        return <span className="text-xs text-gray-500">{task.wbs_code}</span>;
      case 'name':
        return (
          <div className="flex items-center" style={{ paddingLeft: `${level * 24}px` }}>
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
                className="cursor-text"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
              >
                {task.name}
              </span>
            )}
          </div>
        );
      case 'start':
        return task.start;
      case 'end':
        return task.end;
      case 'duration_days':
        return `${task.duration_days}日`;
      case 'priority':
        return (
          <span className={`px-2 py-1 rounded text-xs ${getPriorityClass(task.priority)}`}>
            {task.priority}
          </span>
        );
      case 'assignee':
        return task.assignee || '-';
      case 'dependencies':
        return task.dependencies && task.dependencies.length > 0 ? (
          <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs" title="依存関係あり">
            依存: {task.dependencies.length}
          </span>
        ) : '-';
      case 'progress':
        return `${task.progress || 0}%`;
      case 'status':
        return task.status || '-';
      default:
        return '-';
    }
  };

  return (
    <>
      <tr
        className={`group border-b border-gray-200 hover:bg-gray-50 ${
          isSelected ? 'bg-blue-50' : ''
        }`}
        onClick={(e) => onToggleSelect(task.id, e.ctrlKey || e.metaKey)}
      >
        {columns.filter(col => col.visible).map((column) => (
          <td
            key={column.id}
            className="py-2 px-3"
            style={{ width: column.width, minWidth: column.width }}
          >
            {column.id === 'name' ? (
              <div className="flex items-center justify-between">
                {getCellContent(column.id)}
                <TaskActions
                  task={task}
                  isExpanded={isExpanded}
                  onToggleExpand={onToggleExpand}
                  onEditTask={onEditTask}
                />
              </div>
            ) : (
              getCellContent(column.id)
            )}
          </td>
        ))}
      </tr>
      
      {isExpanded && task.children && task.children.map(child => (
        <TaskRow
          key={child.id}
          task={child}
          level={level + 1}
          columns={columns}
          isSelected={selectedTaskIds.includes(child.id)}
          isExpanded={expandedTaskIds ? expandedTaskIds.has(child.id) : true}
          selectedTaskIds={selectedTaskIds}
          expandedTaskIds={expandedTaskIds}
          onToggleSelect={onToggleSelect}
          onToggleExpand={onToggleExpand}
          onEditTask={onEditTask}
        />
      ))}
    </>
  );
}

export function TableView() {
  const { state, dispatch } = useWBS();
  const { wbs } = state.project;
  const { selectedTaskIds } = state;
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(() => {
    const flatTasks = flattenTasks(wbs);
    return new Set(flatTasks.filter(task => task.children && task.children.length > 0).map(task => task.id));
  });
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ columnId: '', direction: null });
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
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

  // ソートされたタスクを計算
  const sortedTasks = useMemo(() => {
    if (!sortConfig.columnId || !sortConfig.direction) {
      return filteredTasks;
    }

    const getValue = (task: WBSTask, columnId: string): string | number => {
      switch (columnId) {
        case 'wbs_code':
        case 'name':
        case 'start':
        case 'end':
        case 'priority':
        case 'assignee':
        case 'status':
          return task[columnId] || '';
        case 'duration_days':
        case 'progress':
          return task[columnId] || 0;
        case 'dependencies':
          return task.dependencies?.length || 0;
        default:
          return '';
      }
    };

    const sortTasks = (tasks: WBSTask[]): WBSTask[] => {
      const sorted = [...tasks].sort((a, b) => {
        const aValue = getValue(a, sortConfig.columnId);
        const bValue = getValue(b, sortConfig.columnId);

        // 比較
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });

      // 子タスクも再帰的にソート
      return sorted.map(task => ({
        ...task,
        children: task.children ? sortTasks(task.children) : undefined
      }));
    };

    return sortTasks(filteredTasks);
  }, [filteredTasks, sortConfig]);

  // 利用可能な担当者一覧を取得
  const availableAssignees = useMemo(() => {
    return getUniqueAssignees(wbs);
  }, [wbs]);

  // 全てのタスクIDを取得（展開/折りたたみ用）
  const allTaskIds = useMemo(() => {
    const flatTasks = flattenTasks(wbs);
    return new Set(flatTasks.filter(task => task.children && task.children.length > 0).map(task => task.id));
  }, [wbs]);

  const handleSort = (columnId: string) => {
    const column = columns.find(col => col.id === columnId);
    if (!column || !column.sortable) return;

    let newDirection: SortDirection = 'asc';
    if (sortConfig.columnId === columnId) {
      if (sortConfig.direction === 'asc') newDirection = 'desc';
      else if (sortConfig.direction === 'desc') newDirection = null;
    }

    setSortConfig({ columnId, direction: newDirection });
  };

  const handleColumnResize = (columnId: string, newWidth: number) => {
    setColumns(columns.map(col =>
      col.id === columnId ? { ...col, width: Math.max(50, newWidth) } : col
    ));
  };

  const handleToggleExpand = (taskId: string) => {
    const taskExists = flattenTasks(wbs).some(task => task.id === taskId);
    if (!taskExists) return;
    
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

  const handleToggleSelect = (taskId: string, isCtrlKey: boolean) => {
    if (isCtrlKey) {
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

  const getSortIcon = (columnId: string) => {
    if (sortConfig.columnId !== columnId) {
      return <ArrowUpDown size={14} className="opacity-30" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp size={14} />;
    }
    if (sortConfig.direction === 'desc') {
      return <ArrowDown size={14} />;
    }
    return <ArrowUpDown size={14} className="opacity-30" />;
  };

  return (
    <>
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
              {wbs.length !== sortedTasks.length && (
                <p className="text-sm text-gray-600 mt-1">
                  {sortedTasks.length} / {wbs.length} 件のタスクを表示
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowColumnSettings(true)}
                className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-2"
                title="カラム設定"
              >
                <Settings size={16} />
                カラム設定
              </button>
              <button
                onClick={() => dispatch({ type: 'ADD_ROOT_TASK' })}
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
        
        <div className="relative overflow-x-auto" style={{ maxHeight: TABLE_MAX_HEIGHT }}>
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
              <tr>
                {columns.filter(col => col.visible).map((column, index) => (
                  <th
                    key={column.id}
                    className="relative py-3 px-3 text-left text-sm font-medium text-gray-700"
                    style={{ width: column.width, minWidth: column.width }}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleSort(column.id)}
                        className={`flex items-center gap-1 ${column.sortable ? 'hover:text-gray-900' : ''}`}
                        disabled={!column.sortable}
                      >
                        {column.name}
                        {column.sortable && getSortIcon(column.id)}
                      </button>
                    </div>
                    
                    {/* カラムリサイズハンドル */}
                    {index < columns.filter(col => col.visible).length - 1 && (
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setResizingColumn(column.id);
                          const startX = e.pageX;
                          const startWidth = column.width;
                          
                          const handleMouseMove = (e: MouseEvent) => {
                            const diff = e.pageX - startX;
                            handleColumnResize(column.id, startWidth + diff);
                          };
                          
                          const handleMouseUp = () => {
                            setResizingColumn(null);
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                          };
                          
                          document.addEventListener('mousemove', handleMouseMove);
                          document.addEventListener('mouseup', handleMouseUp);
                        }}
                      />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody>
              {sortedTasks.length === 0 ? (
                <tr>
                  <td colSpan={columns.filter(col => col.visible).length} className="p-8 text-center text-gray-500">
                    {wbs.length === 0 
                      ? 'タスクがありません。「ルートタスクを追加」ボタンからタスクを作成してください。'
                      : 'フィルタリング条件に一致するタスクがありません。'}
                  </td>
                </tr>
              ) : (
                sortedTasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    level={0}
                    columns={columns}
                    isSelected={selectedTaskIds.includes(task.id)}
                    isExpanded={expandedTaskIds.has(task.id)}
                    selectedTaskIds={selectedTaskIds}
                    expandedTaskIds={expandedTaskIds}
                    onToggleSelect={handleToggleSelect}
                    onToggleExpand={handleToggleExpand}
                    onEditTask={setEditingTaskId}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showColumnSettings && (
        <ColumnSettings
          columns={columns}
          onColumnsChange={setColumns}
          onClose={() => setShowColumnSettings(false)}
        />
      )}

      {editingTaskId && (
        <TaskEditModal
          taskId={editingTaskId}
          onClose={() => setEditingTaskId(null)}
        />
      )}
    </>
  );
} 