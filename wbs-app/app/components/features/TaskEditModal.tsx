'use client';

import { useState, useEffect } from 'react';
import { useWBS } from '@/app/hooks/useWBS';
import { WBSTask } from '@/app/lib/types';
import { X, AlertTriangle } from 'lucide-react';
import { flattenTasks, detectCircularDependencies } from '@/app/lib/task-utils';
import { isParentTask } from '@/app/lib/wbs-utils';

interface TaskEditModalProps {
  taskId: string;
  onClose: () => void;
}

export function TaskEditModal({ taskId, onClose }: TaskEditModalProps) {
  const { state, dispatch } = useWBS();
  const task = findTask(state.project.wbs, taskId);
  
  // 親タスクかどうかを判定
  const isParent = task ? isParentTask(task) : false;

  const [formData, setFormData] = useState<Partial<WBSTask>>({
    name: '',
    description: '',
    priority: 'Must',
    start: '',
    duration_days: 1,
    progress: 0,
    status: 'Not Started',
    assignee: '',
    dependencies: [],
    notes: ''
  });

  const [circularDependencyWarning, setCircularDependencyWarning] = useState<string[]>([]);

  // 利用可能な前提タスク一覧（自分自身と子タスクを除く）
  const availableDependencies = flattenTasks(state.project.wbs).filter(t => {
    if (t.id === taskId) return false; // 自分自身を除く
    // 子タスクも除く（循環依存防止）
    return !isChildTask(t, taskId, state.project.wbs);
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
        dependencies: task.dependencies || [],
        notes: task.notes || ''
      });
    }
  }, [task]);

  // 依存関係変更時の循環依存チェック
  useEffect(() => {
    if (formData.dependencies && formData.dependencies.length > 0) {
      // 仮想的にタスクを更新して循環依存をチェック
      const updatedTask = { ...task!, ...formData };
      const updatedTasks = updateTaskInProject(state.project.wbs, updatedTask);
      const circularTasks = detectCircularDependencies(updatedTasks);
      setCircularDependencyWarning(circularTasks);
    } else {
      setCircularDependencyWarning([]);
    }
  }, [formData.dependencies, task, state.project.wbs]);

  if (!task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 循環依存がある場合は警告
    if (circularDependencyWarning.length > 0) {
      if (!confirm('循環依存が検出されました。このまま保存しますか？')) {
        return;
      }
    }

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

  const handleDependencyToggle = (depTaskId: string) => {
    const currentDeps = formData.dependencies || [];
    const newDeps = currentDeps.includes(depTaskId)
      ? currentDeps.filter(id => id !== depTaskId)
      : [...currentDeps, depTaskId];
    setFormData({ ...formData, dependencies: newDeps });
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
            {/* 循環依存警告 */}
            {circularDependencyWarning.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start gap-2">
                <AlertTriangle className="text-yellow-600 mt-0.5" size={16} />
                <div>
                  <div className="font-medium text-yellow-800">循環依存が検出されました</div>
                  <div className="text-sm text-yellow-700">
                    関連するタスク: {circularDependencyWarning.map(id => {
                      const t = findTask(state.project.wbs, id);
                      return t?.name || id;
                    }).join(', ')}
                  </div>
                </div>
              </div>
            )}

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
                  {isParent && <span className="text-xs text-gray-500 ml-1">(子タスクから自動計算)</span>}
                </label>
                <input
                  type="date"
                  value={formData.start}
                  onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isParent ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  required
                  disabled={isParent}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  期間（日）
                  {isParent && <span className="text-xs text-gray-500 ml-1">(子タスクから自動計算)</span>}
                </label>
                <input
                  type="number"
                  value={formData.duration_days}
                  onChange={(e) => setFormData({ ...formData, duration_days: parseFloat(e.target.value) || 0.5 })}
                  min="0.5"
                  step="0.5"
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isParent ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  required
                  disabled={isParent}
                />
              </div>
            </div>

            {/* 進捗とステータス */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  進捗率 (%)
                  {isParent && <span className="text-xs text-gray-500 ml-1">(子タスクから自動計算)</span>}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    value={formData.progress}
                    onChange={(e) => handleProgressChange(parseInt(e.target.value))}
                    min="0"
                    max="100"
                    className={`flex-1 ${isParent ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isParent}
                  />
                  <input
                    type="number"
                    value={formData.progress}
                    onChange={(e) => handleProgressChange(parseInt(e.target.value) || 0)}
                    min="0"
                    max="100"
                    className={`w-16 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isParent ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    disabled={isParent}
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

            {/* 依存関係（前提タスク） */}
            {availableDependencies.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  前提タスク
                </label>
                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2 space-y-1">
                  {availableDependencies.map(depTask => (
                    <label key={depTask.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.dependencies?.includes(depTask.id) || false}
                        onChange={() => handleDependencyToggle(depTask.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm">
                        {depTask.wbs_code} - {depTask.name}
                      </span>
                    </label>
                  ))}
                </div>
                {formData.dependencies && formData.dependencies.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    選択中: {formData.dependencies.length} 件のタスク
                  </div>
                )}
              </div>
            )}

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

// 子タスクかどうかをチェック
function isChildTask(candidate: WBSTask, parentId: string, tasks: WBSTask[]): boolean {
  const parent = findTask(tasks, parentId);
  if (!parent || !parent.children) return false;
  
  const checkChildren = (children: WBSTask[]): boolean => {
    for (const child of children) {
      if (child.id === candidate.id) return true;
      if (child.children && checkChildren(child.children)) return true;
    }
    return false;
  };
  
  return checkChildren(parent.children);
}

// タスクをプロジェクト内で更新
function updateTaskInProject(tasks: WBSTask[], updatedTask: WBSTask): WBSTask[] {
  return tasks.map(task => {
    if (task.id === updatedTask.id) {
      return updatedTask;
    }
    if (task.children) {
      return {
        ...task,
        children: updateTaskInProject(task.children, updatedTask)
      };
    }
    return task;
  });
} 