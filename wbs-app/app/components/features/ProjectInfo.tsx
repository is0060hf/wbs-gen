'use client';

import { useState } from 'react';
import { useWBS } from '@/app/hooks/useWBS';
import { PenSquare, Save, X } from 'lucide-react';

export function ProjectInfo() {
  const { state, dispatch } = useWBS();
  const { project_info } = state.project;
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(project_info);

  const handleEdit = () => {
    setEditForm(project_info);
    setIsEditing(true);
  };

  const handleSave = () => {
    dispatch({
      type: 'UPDATE_PROJECT_INFO',
      payload: editForm
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm(project_info);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">プロジェクト情報編集</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              プロジェクト名
            </label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              バージョン
            </label>
            <input
              type="text"
              value={editForm.version}
              onChange={(e) => setEditForm({ ...editForm, version: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              説明
            </label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <Save size={16} />
              保存
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              <X size={16} />
              キャンセル
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-semibold">{project_info.name}</h2>
        <button
          onClick={handleEdit}
          className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
        >
          <PenSquare size={16} />
          編集
        </button>
      </div>
      <div className="space-y-2 text-sm text-gray-600">
        <div>
          <span className="font-medium">バージョン:</span> {project_info.version}
        </div>
        <div>
          <span className="font-medium">PMBOKバージョン:</span> {project_info.pmbok_version}
        </div>
        {project_info.description && (
          <div>
            <span className="font-medium">説明:</span>
            <p className="mt-1 text-gray-700">{project_info.description}</p>
          </div>
        )}
        {project_info.created_at && (
          <div>
            <span className="font-medium">作成日:</span> {project_info.created_at}
          </div>
        )}
        {project_info.updated_at && (
          <div>
            <span className="font-medium">更新日:</span> {project_info.updated_at}
          </div>
        )}
      </div>
    </div>
  );
} 