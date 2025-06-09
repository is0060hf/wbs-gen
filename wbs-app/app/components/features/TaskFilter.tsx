'use client';

import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';

export interface FilterOptions {
  searchTerm: string;
  priorities: string[];
  statuses: string[];
  assignees: string[];
  dateRange: 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'custom';
  showCriticalOnly: boolean;
  showDelayedOnly: boolean;
}

interface TaskFilterProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  availableAssignees: string[];
}

export function TaskFilter({ filters, onFiltersChange, availableAssignees }: TaskFilterProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

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
    </div>
  );
} 