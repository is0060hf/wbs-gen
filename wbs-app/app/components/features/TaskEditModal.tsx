'use client';

import { useState, useEffect } from 'react';
import { useWBS } from '@/app/hooks/useWBS';
import { WBSTask } from '@/app/lib/types';
import { X } from 'lucide-react';

interface TaskEditModalProps {
  taskId: string;
  onClose: () => void;
}

export function TaskEditModal({ taskId, onClose }: TaskEditModalProps) {
  const { state, dispatch } = useWBS();
  const task = findTask(state.project.wbs, taskId);
  
  const [formData, setFormData] = useState<Partial<WBSTask>>({
    name: '',
    description: '',
    priority: 'Must',
    start: '',
    duration_days: 1,
    progress: 0,
    status: 'Not Started',
    assignee: '',
    notes: ''
  });

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name,
        description: task.description || '',
        priority: task.priority,
        start: task.start,
        duration_days: task.duration_days,
        progress: task.progress || 0,
        status: task.status || 'Not Started',
        assignee: task.assignee || '',
        notes: task.notes || ''
      });
    }
  }, [task]);

  if (!task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        taskId: task.id,
        updates: formData
      }
    });
    onClose();
  };

  const handleProgressChange = (value: number) => {
    const progress = Math.max(0, Math.min(100, value));
    setFormData({ ...formData, progress });
    
    // 進捗に基づいてステータスを自動更新
    if (progress === 0) {
      setFormData({ ...formData, progress, status: 'Not Started' });
    } else if (progress === 100) {
      setFormData({ ...formData, progress, status: 'Completed' });
    } else {
      setFormData({ ...formData, progress, status: 'In Progress' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">タスク編集: {task.wbs_code} {task.name}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          <div className="space-y-4">
            {/* タスク名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                タスク名 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* 説明 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                説明
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 優先度 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                優先度
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as WBSTask['priority'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Must">Must</option>
                <option value="Should">Should</option>
                <option value="Could">Could</option>
                <option value="Won't">Won't</option>
              </select>
            </div>

            {/* 日程 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開始日
                </label>
                <input
                  type="date"
                  value={formData.start}
                  onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  期間（日）
                </label>
                <input
                  type="number"
                  value={formData.duration_days}
                  onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) || 1 })}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* 進捗とステータス */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  進捗率 (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    value={formData.progress}
                    onChange={(e) => handleProgressChange(parseInt(e.target.value))}
                    min="0"
                    max="100"
                    className="flex-1"
                  />
                  <input
                    type="number"
                    value={formData.progress}
                    onChange={(e) => handleProgressChange(parseInt(e.target.value) || 0)}
                    min="0"
                    max="100"
                    className="w-16 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ステータス
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as WBSTask['status'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Not Started">未着手</option>
                  <option value="In Progress">進行中</option>
                  <option value="Completed">完了</option>
                  <option value="Delayed">遅延</option>
                </select>
              </div>
            </div>

            {/* 担当者 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                担当者
              </label>
              <input
                type="text"
                value={formData.assignee}
                onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* メモ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メモ
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ヘルパー関数
function findTask(tasks: WBSTask[], taskId: string): WBSTask | null {
  for (const task of tasks) {
    if (task.id === taskId) return task;
    if (task.children) {
      const found = findTask(task.children, taskId);
      if (found) return found;
    }
  }
  return null;
} 