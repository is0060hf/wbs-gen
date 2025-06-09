'use client';

import { useState, useCallback } from 'react';
import { Toast, ToastType } from '@/app/components/ui/Toast';

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // トースト追加
  const addToast = useCallback((
    type: ToastType,
    title: string,
    message?: string,
    duration: number = 5000,
    actions?: Toast['actions']
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newToast: Toast = {
      id,
      type,
      title,
      message,
      duration,
      actions
    };

    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  // 特定のトースト削除
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // 全てのトースト削除
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // 便利メソッド
  const success = useCallback((title: string, message?: string, duration?: number) => {
    return addToast('success', title, message, duration);
  }, [addToast]);

  const error = useCallback((title: string, message?: string, duration?: number) => {
    return addToast('error', title, message, duration || 8000); // エラーは少し長く表示
  }, [addToast]);

  const warning = useCallback((title: string, message?: string, duration?: number) => {
    return addToast('warning', title, message, duration);
  }, [addToast]);

  const info = useCallback((title: string, message?: string, duration?: number) => {
    return addToast('info', title, message, duration);
  }, [addToast]);

  // 確認用トースト（Undo機能付き）
  const successWithUndo = useCallback((
    title: string, 
    message?: string, 
    onUndo?: () => void,
    duration: number = 8000
  ) => {
    const actions = onUndo ? [{
      label: '元に戻す',
      onClick: onUndo
    }] : undefined;

    return addToast('success', title, message, duration, actions);
  }, [addToast]);

  // エラー用トースト（再試行機能付き）
  const errorWithRetry = useCallback((
    title: string,
    message?: string,
    onRetry?: () => void,
    duration: number = 0 // 永続表示
  ) => {
    const actions = onRetry ? [{
      label: '再試行',
      onClick: onRetry
    }] : undefined;

    return addToast('error', title, message, duration, actions);
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    // 便利メソッド
    success,
    error,
    warning,
    info,
    successWithUndo,
    errorWithRetry
  };
} 