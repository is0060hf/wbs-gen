'use client';

import { useState, useRef } from 'react';
import { useWBS } from '@/app/hooks/useWBS';
import { normalizeImportedProject } from '@/app/lib/wbs-utils';
import { Upload, Download, FileText, Copy, Check } from 'lucide-react';

export function ImportExportButtons() {
  const { state, dispatch } = useWBS();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showTextImport, setShowTextImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const normalizedProject = normalizeImportedProject(data);
      
      dispatch({
        type: 'IMPORT_PROJECT',
        payload: normalizedProject
      });
      
      setImportError(null);
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setImportError('インポートに失敗しました。JSONファイルの形式を確認してください。');
    }
  };

  const handleTextImport = () => {
    try {
      const data = JSON.parse(importText);
      const normalizedProject = normalizeImportedProject(data);
      
      dispatch({
        type: 'IMPORT_PROJECT',
        payload: normalizedProject
      });
      
      setImportError(null);
      setImportText('');
      setShowTextImport(false);
    } catch (error) {
      setImportError('JSONの形式が正しくありません。');
    }
  };

  const handleExport = () => {
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

  const handleCopyToClipboard = async () => {
    const exportData = {
      ...state.project,
      project_info: {
        ...state.project.project_info,
        updated_at: new Date().toISOString().split('T')[0]
      }
    };
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      setImportError('クリップボードへのコピーに失敗しました。');
    }
  };

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileImport}
          className="hidden"
          id="import-file"
        />
        <label
          htmlFor="import-file"
          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          <Upload size={16} />
          JSONインポート
        </label>
        
        <button
          onClick={() => setShowTextImport(!showTextImport)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
        >
          <FileText size={16} />
          テキストインポート
        </button>
        
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          <Download size={16} />
          JSONエクスポート
        </button>
        
        <button
          onClick={handleCopyToClipboard}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'コピー済み' : 'クリップボードにコピー'}
        </button>
      </div>

      {showTextImport && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium mb-2">JSONテキストを貼り付け</h3>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            className="w-full h-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
            placeholder='{"project_info": {...}, "wbs": [...]}'
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleTextImport}
              disabled={!importText.trim()}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              インポート
            </button>
            <button
              onClick={() => {
                setShowTextImport(false);
                setImportText('');
                setImportError(null);
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {importError && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {importError}
        </div>
      )}
    </>
  );
} 