'use client';

import { WBSProvider } from '@/app/contexts/WBSContext';
import { ProjectInfo } from '@/app/components/features/ProjectInfo';
import { ProjectActions } from '@/app/components/features/ProjectActions';
import { ImportExportButtons } from '@/app/components/features/ImportExport';
import { TaskList } from '@/app/components/features/TaskList';

export default function Home() {
  return (
    <WBSProvider>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-gray-900">WBS管理システム</h1>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* プロジェクトアクション */}
            <div className="flex flex-wrap gap-4 justify-between items-start">
              <ProjectActions />
              <ImportExportButtons />
            </div>

            {/* プロジェクト情報 */}
            <ProjectInfo />

            {/* タスク一覧 */}
            <TaskList />
          </div>
        </main>
      </div>
    </WBSProvider>
  );
}
