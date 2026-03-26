'use client';

interface MacroBarProps {
  label: string;
  current: number;
  goal: number;
  unit?: string;
  colorClass: string;
  textColorClass: string;
}

export function MacroBar({
  label,
  current,
  goal,
  unit = 'g',
  colorClass,
  textColorClass,
}: MacroBarProps) {
  const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const actualPercentage = goal > 0 ? Math.round((current / goal) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className={`text-sm font-medium ${textColorClass}`}>{label}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
          {Math.round(current)}{unit} / {Math.round(goal)}{unit}
          <span className="ml-1 text-xs">({actualPercentage}%)</span>
        </span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
