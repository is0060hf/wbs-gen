'use client';

import { useWBS } from '@/app/hooks/useWBS';
import { FilePlus, FolderOpen, Package } from 'lucide-react';

export function ProjectActions() {
  const { dispatch } = useWBS();

  const handleNewProject = () => {
    if (confirm('現在のプロジェクトを破棄して新規プロジェクトを作成しますか？')) {
      dispatch({ type: 'CREATE_NEW_PROJECT' });
    }
  };

  const handleLoadSample = () => {
    if (confirm('現在のプロジェクトを破棄してサンプルプロジェクトを読み込みますか？')) {
      dispatch({ type: 'LOAD_SAMPLE_PROJECT' });
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleNewProject}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
      >
        <FilePlus size={16} />
        新規プロジェクト
      </button>
      
      <button
        onClick={handleLoadSample}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
      >
        <Package size={16} />
        サンプルプロジェクト
      </button>
    </div>
  );
} 