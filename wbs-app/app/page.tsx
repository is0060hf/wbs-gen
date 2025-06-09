'use client';

import { useState, useRef } from 'react';
import { WBSProvider } from '@/app/contexts/WBSContext';
import { ThemeProvider } from '@/app/hooks/useTheme';
import { DragDropProvider } from '@/app/components/ui/DragDropContext';
import { ProjectInfo } from '@/app/components/features/ProjectInfo';
import { ProjectActions } from '@/app/components/features/ProjectActions';
import { ImportExportButtons } from '@/app/components/features/ImportExport';
import { TableView } from '@/app/components/features/TableView';
import { GanttChart } from '@/app/components/features/GanttChart';
import { HistoryPanel } from '@/app/components/features/HistoryPanel';
import { ToastContainer } from '@/app/components/ui/Toast';
import { LoadingOverlay } from '@/app/components/ui/LoadingSpinner';
import { ThemeToggle } from '@/app/hooks/useTheme';
import { useKeyboardShortcuts } from '@/app/hooks/useKeyboardShortcuts';
import { useWBS } from '@/app/hooks/useWBS';
import { List, BarChart3, Keyboard } from 'lucide-react';

type ViewMode = 'list' | 'gantt';

function MainContent() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { state, dispatch, toasts, removeToast, showToast } = useWBS();

  const handleExportProject = async () => {
    setIsLoading(true);
    setLoadingText('プロジェクトをエクスポート中...');
    
    try {
      // 少し遅延を入れてローディング表示をわかりやすくする
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
      
      showToast.success('エクスポートが完了しました');
    } catch (error) {
      showToast.error('エクスポートに失敗しました');
    } finally {
      setIsLoading(false);
    }
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

    setIsLoading(true);
    setLoadingText('プロジェクトをインポート中...');

    try {
      // ファイル読み込み
      const text = await file.text();
      const data = JSON.parse(text);
      
      // 少し遅延を入れてローディング表示をわかりやすくする
      await new Promise(resolve => setTimeout(resolve, 500));
      
      dispatch({
        type: 'IMPORT_PROJECT',
        payload: data
      });
      
      showToast.success('プロジェクトをインポートしました', `ファイル: ${file.name}`);
    } catch (error) {
      showToast.error(
        'インポートに失敗しました',
        'JSONファイルの形式を確認してください。'
      );
    } finally {
      setIsLoading(false);
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileImport}
        className="hidden"
      />

      <header className="bg-white dark:bg-gray-800 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">WBS管理システム</h1>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => setShowShortcuts(!showShortcuts)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                title="キーボードショートカット"
              >
                <Keyboard size={16} />
                ショートカット
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ショートカット一覧（表示時のみ） */}
      {showShortcuts && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">キーボードショートカット</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-sm">
                  {shortcuts.map((shortcut, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="font-mono text-blue-700 dark:text-blue-300">{shortcut.key}</span>
                      <span className="text-blue-600 dark:text-blue-400 ml-2">{shortcut.description}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
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

          {/* サイドパネルとタスクビュー */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* メインコンテンツ */}
            <div className="lg:col-span-3">
              {viewMode === 'list' ? <TableView /> : <GanttChart />}
            </div>
            
            {/* サイドパネル */}
            <div className="lg:col-span-1 space-y-4">
              <HistoryPanel />
            </div>
          </div>
        </div>
      </main>
      
      {/* トースト通知 */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      {/* ローディングオーバーレイ */}
      <LoadingOverlay isVisible={isLoading} text={loadingText} />
    </div>
  );
}

export default function Home() {
  return (
    <ThemeProvider>
      <DragDropProvider>
        <WBSProvider>
          <MainContent />
        </WBSProvider>
      </DragDropProvider>
    </ThemeProvider>
  );
}
