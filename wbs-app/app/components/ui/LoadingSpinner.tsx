'use client';

import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export function LoadingSpinner({ size = 'md', className = '', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center gap-2">
        <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-500`} />
        {text && (
          <span className="text-sm text-gray-600">{text}</span>
        )}
      </div>
    </div>
  );
}

interface LoadingOverlayProps {
  isVisible: boolean;
  text?: string;
  onCancel?: () => void;
}

export function LoadingOverlay({ isVisible, text = 'Loading...', onCancel }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 min-w-[200px] flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900">{text}</p>
          <p className="text-sm text-gray-500 mt-1">しばらくお待ちください...</p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            キャンセル
          </button>
        )}
      </div>
    </div>
  );
}

interface LoadingButtonProps {
  isLoading: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export function LoadingButton({ 
  isLoading, 
  onClick, 
  children, 
  className = '', 
  disabled = false,
  type = 'button' 
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`${className} ${
        (disabled || isLoading) ? 'cursor-not-allowed bg-gray-300 text-gray-600' : ''
      }`}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      aria-disabled={disabled || isLoading}
    >
      {isLoading && <LoadingSpinner size="sm" />}
      {children}
    </button>
  );
} 