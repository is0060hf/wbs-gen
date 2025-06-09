'use client';

import { useState, useRef } from 'react';
import { WBSProvider } from '@/app/contexts/WBSContext';
import { ProjectInfo } from '@/app/components/features/ProjectInfo';
import { ProjectActions } from '@/app/components/features/ProjectActions';
import { ImportExportButtons } from '@/app/components/features/ImportExport';
import { TaskList } from '@/app/components/features/TaskList';
import { GanttChart } from '@/app/components/features/GanttChart';
import { useKeyboardShortcuts } from '@/app/hooks/useKeyboardShortcuts';
import { useWBS } from '@/app/hooks/useWBS';
import { List, BarChart3, Keyboard } from 'lucide-react';

type ViewMode = 'list' | 'gantt';

function MainContent() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { state, dispatch } = useWBS();

  const handleExportProject = () => {
    const exportData = {
      ...state.project,
      project_info: {
        ...state.project.project_info,
        updated_at: new Date().toISOString().split('T')[0]
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wbs-${state.project.project_info.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportProject = () => {
    fileInputRef.current?.click();
  };

  const handleAddTask = () => {
    dispatch({ type: 'ADD_ROOT_TASK' });
  };

  const { shortcuts } = useKeyboardShortcuts({
    onExportProject: handleExportProject,
    onImportProject: handleImportProject,
    onAddTask: handleAddTask
  });

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      dispatch({
        type: 'IMPORT_PROJECT',
        payload: data
      });
    } catch (error) {
      alert('インポートに失敗しました。JSONファイルの形式を確認してください。');
    }

    // ファイル入力をリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileImport}
        className="hidden"
      />

      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">WBS管理システム</h1>
            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
              title="キーボードショートカット"
            >
              <Keyboard size={16} />
              ショートカット
            </button>
          </div>
        </div>
      </header>

      {/* ショートカット一覧（表示時のみ） */}
      {showShortcuts && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-blue-900 mb-2">キーボードショートカット</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-sm">
                  {shortcuts.map((shortcut, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="font-mono text-blue-700">{shortcut.key}</span>
                      <span className="text-blue-600 ml-2">{shortcut.description}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* プロジェクトアクション */}
          <div className="flex flex-wrap gap-4 justify-between items-start">
            <ProjectActions />
            <ImportExportButtons />
          </div>

          {/* プロジェクト情報 */}
          <ProjectInfo />

          {/* ビュー切り替え */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">表示:</span>
            <div className="flex rounded-md border border-gray-300 overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-4 py-2 text-sm ${
                  viewMode === 'list'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <List size={16} />
                リスト
              </button>
              <button
                onClick={() => setViewMode('gantt')}
                className={`flex items-center gap-2 px-4 py-2 text-sm ${
                  viewMode === 'gantt'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <BarChart3 size={16} />
                ガントチャート
              </button>
            </div>
          </div>

          {/* タスクビュー */}
          {viewMode === 'list' ? <TaskList /> : <GanttChart />}
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <WBSProvider>
      <MainContent />
    </WBSProvider>
  );
}
