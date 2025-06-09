'use client';

interface ProgressBarProps {
  value: number; // 0-100の値
  max?: number;
  className?: string;
  showLabel?: boolean;
  label?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({ 
  value, 
  max = 100, 
  className = '', 
  showLabel = true,
  label,
  color = 'blue',
  size = 'md'
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500'
  };

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-700">
            {label || 'Progress'}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showLabel?: boolean;
  className?: string;
}

export function CircularProgress({
  value,
  max = 100,
  size = 40,
  strokeWidth = 4,
  color = '#3b82f6',
  backgroundColor = '#e5e7eb',
  showLabel = true,
  className = ''
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out"
        />
      </svg>
      {showLabel && (
        <span className="absolute text-xs font-medium text-gray-700">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

interface TaskProgressProps {
  task: {
    progress?: number;
    status?: string;
    name: string;
  };
  showDetails?: boolean;
}

export function TaskProgress({ task, showDetails = false }: TaskProgressProps) {
  const progress = task.progress || 0;
  
  const getProgressColor = () => {
    if (task.status === 'Completed') return 'green';
    if (task.status === 'Delayed') return 'red';
    if (task.status === 'In Progress') return 'blue';
    return 'gray' as any;
  };

  const getStatusText = () => {
    switch (task.status) {
      case 'Not Started': return '未着手';
      case 'In Progress': return '進行中';
      case 'Completed': return '完了';
      case 'Delayed': return '遅延';
      default: return '未着手';
    }
  };

  return (
    <div className="space-y-1">
      <ProgressBar
        value={progress}
        color={getProgressColor()}
        showLabel={showDetails}
        label={showDetails ? task.name : undefined}
        size="sm"
      />
      {showDetails && (
        <div className="flex justify-between text-xs text-gray-500">
          <span>{getStatusText()}</span>
          <span>{progress}% 完了</span>
        </div>
      )}
    </div>
  );
} 