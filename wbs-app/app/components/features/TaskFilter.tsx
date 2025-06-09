'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, X, Save, FolderOpen, Trash2 } from 'lucide-react';

export interface FilterOptions {
  searchTerm: string;
  priorities: string[];
  statuses: string[];
  assignees: string[];
  dateRange: 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'custom';
  showCriticalOnly: boolean;
  showDelayedOnly: boolean;
}

interface SavedFilter {
  id: string;
  name: string;
  filters: FilterOptions;
  createdAt: string;
}

interface TaskFilterProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  availableAssignees: string[];
}

export function TaskFilter({ filters, onFiltersChange, availableAssignees }: TaskFilterProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');

  // ローカルストレージから保存されたフィルターを読み込み
  useEffect(() => {
    try {
      const saved = localStorage.getItem('wbs-saved-filters');
      if (saved) {
        setSavedFilters(JSON.parse(saved));
      }
    } catch (error) {
      console.error('フィルター読み込みエラー:', error);
    }
  }, []);

  // フィルターを保存
  const saveFilter = () => {
    if (!saveFilterName.trim()) return;

    const newFilter: SavedFilter = {
      id: `filter-${Date.now()}`,
      name: saveFilterName.trim(),
      filters: { ...filters },
      createdAt: new Date().toISOString()
    };

    const updatedFilters = [...savedFilters, newFilter];
    setSavedFilters(updatedFilters);
    localStorage.setItem('wbs-saved-filters', JSON.stringify(updatedFilters));
    setSaveFilterName('');
    setShowSaveDialog(false);
  };

  // フィルターを読み込み
  const loadFilter = (savedFilter: SavedFilter) => {
    onFiltersChange(savedFilter.filters);
    setShowLoadDialog(false);
  };

  // フィルターを削除
  const deleteFilter = (filterId: string) => {
    const updatedFilters = savedFilters.filter(f => f.id !== filterId);
    setSavedFilters(updatedFilters);
    localStorage.setItem('wbs-saved-filters', JSON.stringify(updatedFilters));
  };

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, searchTerm: value });
  };

  const handlePriorityToggle = (priority: string) => {
    const priorities = filters.priorities.includes(priority)
      ? filters.priorities.filter(p => p !== priority)
      : [...filters.priorities, priority];
    onFiltersChange({ ...filters, priorities });
  };

  const handleStatusToggle = (status: string) => {
    const statuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    onFiltersChange({ ...filters, statuses });
  };

  const handleAssigneeToggle = (assignee: string) => {
    const assignees = filters.assignees.includes(assignee)
      ? filters.assignees.filter(a => a !== assignee)
      : [...filters.assignees, assignee];
    onFiltersChange({ ...filters, assignees });
  };

  const clearFilters = () => {
    onFiltersChange({
      searchTerm: '',
      priorities: [],
      statuses: [],
      assignees: [],
      dateRange: 'all',
      showCriticalOnly: false,
      showDelayedOnly: false
    });
  };

  const hasActiveFilters = filters.searchTerm || 
    filters.priorities.length > 0 || 
    filters.statuses.length > 0 || 
    filters.assignees.length > 0 || 
    filters.dateRange !== 'all' ||
    filters.showCriticalOnly ||
    filters.showDelayedOnly;

  const priorityOptions = [
    { value: 'Must', label: 'Must', color: 'bg-red-100 text-red-700' },
    { value: 'Should', label: 'Should', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'Could', label: 'Could', color: 'bg-green-100 text-green-700' },
    { value: 'Won\'t', label: 'Won\'t', color: 'bg-gray-100 text-gray-700' }
  ];

  const statusOptions = [
    { value: 'Not Started', label: '未着手' },
    { value: 'In Progress', label: '進行中' },
    { value: 'Completed', label: '完了' },
    { value: 'Delayed', label: '遅延' }
  ];

  const dateRangeOptions = [
    { value: 'all', label: 'すべて' },
    { value: 'today', label: '今日' },
    { value: 'thisWeek', label: '今週' },
    { value: 'thisMonth', label: '今月' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="タスク名で検索..."
            value={filters.searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${
            showAdvanced 
              ? 'bg-blue-50 border-blue-200 text-blue-700' 
              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Filter size={16} />
          詳細フィルター
        </button>

        {/* フィルター保存・読み込みボタン */}
        {hasActiveFilters && (
          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100"
            title="現在のフィルター条件を保存"
          >
            <Save size={16} />
            保存
          </button>
        )}

        {savedFilters.length > 0 && (
          <button
            onClick={() => setShowLoadDialog(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100"
            title="保存されたフィルター条件を読み込み"
          >
            <FolderOpen size={16} />
            読み込み
          </button>
        )}

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100"
          >
            <X size={16} />
            クリア
          </button>
        )}
      </div>

      {showAdvanced && (
        <div className="space-y-4 border-t pt-4">
          {/* 優先度フィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              優先度
            </label>
            <div className="flex flex-wrap gap-2">
              {priorityOptions.map(priority => (
                <button
                  key={priority.value}
                  onClick={() => handlePriorityToggle(priority.value)}
                  className={`px-3 py-1 rounded text-sm border transition-colors ${
                    filters.priorities.includes(priority.value)
                      ? `${priority.color} border-current`
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {priority.label}
                </button>
              ))}
            </div>
          </div>

          {/* ステータスフィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ステータス
            </label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map(status => (
                <button
                  key={status.value}
                  onClick={() => handleStatusToggle(status.value)}
                  className={`px-3 py-1 rounded text-sm border transition-colors ${
                    filters.statuses.includes(status.value)
                      ? 'bg-blue-100 text-blue-700 border-blue-200'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* 担当者フィルター */}
          {availableAssignees.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                担当者
              </label>
              <div className="flex flex-wrap gap-2">
                {availableAssignees.map(assignee => (
                  <button
                    key={assignee}
                    onClick={() => handleAssigneeToggle(assignee)}
                    className={`px-3 py-1 rounded text-sm border transition-colors ${
                      filters.assignees.includes(assignee)
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {assignee}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 期間フィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              期間
            </label>
            <div className="flex flex-wrap gap-2">
              {dateRangeOptions.map(range => (
                <button
                  key={range.value}
                  onClick={() => onFiltersChange({ ...filters, dateRange: range.value as any })}
                  className={`px-3 py-1 rounded text-sm border transition-colors ${
                    filters.dateRange === range.value
                      ? 'bg-purple-100 text-purple-700 border-purple-200'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* 特別フィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              特別フィルター
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.showCriticalOnly}
                  onChange={(e) => onFiltersChange({ ...filters, showCriticalOnly: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">クリティカルパスのみ表示</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.showDelayedOnly}
                  onChange={(e) => onFiltersChange({ ...filters, showDelayedOnly: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">遅延タスクのみ表示</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* アクティブフィルターの表示 */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm text-gray-600 mb-2">アクティブフィルター:</div>
          <div className="flex flex-wrap gap-2">
            {filters.searchTerm && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                検索: "{filters.searchTerm}"
              </span>
            )}
            {filters.priorities.map(priority => (
              <span key={priority} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                優先度: {priority}
              </span>
            ))}
            {filters.statuses.map(status => (
              <span key={status} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                ステータス: {statusOptions.find(s => s.value === status)?.label}
              </span>
            ))}
            {filters.assignees.map(assignee => (
              <span key={assignee} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                担当者: {assignee}
              </span>
            ))}
            {filters.dateRange !== 'all' && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                期間: {dateRangeOptions.find(r => r.value === filters.dateRange)?.label}
              </span>
            )}
            {filters.showCriticalOnly && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                クリティカルパスのみ
              </span>
            )}
            {filters.showDelayedOnly && (
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                遅延タスクのみ
              </span>
            )}
          </div>
        </div>
      )}

      {/* フィルター保存ダイアログ */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">フィルター条件を保存</h3>
            <input
              type="text"
              placeholder="フィルター名を入力"
              value={saveFilterName}
              onChange={(e) => setSaveFilterName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveFilter();
                if (e.key === 'Escape') setShowSaveDialog(false);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={saveFilter}
                disabled={!saveFilterName.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* フィルター読み込みダイアログ */}
      {showLoadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">保存されたフィルター</h3>
            {savedFilters.length === 0 ? (
              <p className="text-gray-500 text-center py-4">保存されたフィルターがありません</p>
            ) : (
              <div className="space-y-2 mb-4">
                {savedFilters.map((savedFilter) => (
                  <div
                    key={savedFilter.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{savedFilter.name}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(savedFilter.createdAt).toLocaleDateString('ja-JP')}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadFilter(savedFilter)}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                      >
                        読み込み
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`「${savedFilter.name}」を削除しますか？`)) {
                            deleteFilter(savedFilter.id);
                          }
                        }}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                        title="削除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => setShowLoadDialog(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 