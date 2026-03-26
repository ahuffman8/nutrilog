'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { User, FoodLogEntry, ActivityEntry, DailyGoals } from '@/types';
import { MacroBar } from './ui/MacroBar';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { Coffee, Sun, Moon, Apple, Trash2, ChevronLeft, ChevronRight, Calendar, Activity } from 'lucide-react';

interface FoodDiaryProps {
  user: User;
}

interface DayLog {
  entries: FoodLogEntry[];
  activities: ActivityEntry[];
  goals: DailyGoals;
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sugar_g: number;
    calories_burned: number;
  };
}

const MEAL_ORDER: FoodLogEntry['meal_type'][] = ['breakfast', 'lunch', 'dinner', 'snack'];

const MEAL_ICONS: Record<string, React.ReactNode> = {
  breakfast: <Coffee className="h-4 w-4" />,
  lunch: <Sun className="h-4 w-4" />,
  dinner: <Moon className="h-4 w-4" />,
  snack: <Apple className="h-4 w-4" />,
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function FoodDiary({ user }: FoodDiaryProps) {
  const [date, setDate] = useState(new Date());
  const [dayLog, setDayLog] = useState<DayLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const dateStr = format(date, 'yyyy-MM-dd');
  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

  const fetchDay = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/log/${dateStr}?user_id=${user.id}`);
      if (!res.ok) throw new Error('Failed to load diary');
      const data = await res.json();
      setDayLog(data);
    } catch (e: any) {
      setError(e.message || 'Could not load diary for this date.');
    } finally {
      setLoading(false);
    }
  }, [dateStr, user.id]);

  useEffect(() => {
    fetchDay();
  }, [fetchDay]);

  const handleDelete = async (entryId: number) => {
    if (!confirm('Delete this entry?')) return;
    setDeletingId(entryId);
    try {
      const res = await fetch('/api/log-entry', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entryId }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchDay();
    } catch (e) {
      alert('Could not delete entry.');
    } finally {
      setDeletingId(null);
    }
  };

  const totals = dayLog?.totals;
  const goals = dayLog?.goals;

  return (
    <div className="space-y-4">
      {/* Date navigation */}
      <div className="rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setDate((d) => subDays(d, 1))}
            className="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-center">
            <div className="flex items-center gap-1.5 justify-center">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <div className="font-bold text-slate-900 dark:text-slate-100">
                {isToday ? 'Today' : format(date, 'EEEE')}
              </div>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {format(date, 'MMMM d, yyyy')}
            </div>
          </div>
          <button
            onClick={() => setDate((d) => addDays(d, 1))}
            disabled={isToday}
            className="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {!isToday && (
          <div className="mt-2 text-center">
            <button
              onClick={() => setDate(new Date())}
              className="text-xs text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
            >
              Jump to Today
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && dayLog && (
        <>
          {/* Daily progress */}
          {goals && totals && (
            <div className="rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  Daily Progress
                </h3>
                <span className="text-2xl font-mono font-bold text-red-500">
                  {Math.round(totals.calories)}
                  <span className="text-sm font-normal text-slate-400"> / {goals.calories} kcal</span>
                </span>
              </div>
              <div className="space-y-3">
                <MacroBar
                  label="Calories"
                  current={totals.calories}
                  goal={goals.calories}
                  unit=" kcal"
                  colorClass="bg-red-500"
                  textColorClass="text-red-500"
                />
                <MacroBar
                  label="Protein"
                  current={totals.protein_g}
                  goal={goals.protein_g}
                  colorClass="bg-green-500"
                  textColorClass="text-green-500"
                />
                <MacroBar
                  label="Carbs"
                  current={totals.carbs_g}
                  goal={goals.carbs_g}
                  colorClass="bg-orange-500"
                  textColorClass="text-orange-500"
                />
                <MacroBar
                  label="Fat"
                  current={totals.fat_g}
                  goal={goals.fat_g}
                  colorClass="bg-blue-500"
                  textColorClass="text-blue-500"
                />
                <MacroBar
                  label="Fiber"
                  current={totals.fiber_g}
                  goal={25}
                  colorClass="bg-purple-500"
                  textColorClass="text-purple-500"
                />
              </div>
            </div>
          )}

          {/* Meal cards */}
          {MEAL_ORDER.map((mealType) => {
            const entries = dayLog.entries.filter((e) => e.meal_type === mealType);
            const mealCalories = entries.reduce(
              (sum, e) => sum + e.items.reduce((s, i) => s + i.calories, 0),
              0
            );

            return (
              <div
                key={mealType}
                className="rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden"
              >
                <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    {MEAL_ICONS[mealType]}
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {capitalize(mealType)}
                    </h3>
                  </div>
                  {mealCalories > 0 && (
                    <span className="text-sm font-mono font-bold text-red-500">
                      {Math.round(mealCalories)} kcal
                    </span>
                  )}
                </div>

                {entries.length === 0 ? (
                  <div className="px-6 py-4 text-sm text-slate-400 dark:text-slate-500 italic">
                    No entries for {mealType}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {entries.map((entry) => (
                      <div key={entry.id} className="px-6 py-4">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs text-slate-400 dark:text-slate-500 italic truncate max-w-xs">
                            &ldquo;{entry.raw_input}&rdquo;
                          </p>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            disabled={deletingId === entry.id}
                            className="ml-2 flex items-center gap-1 text-xs text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors disabled:opacity-50 shrink-0"
                          >
                            {deletingId === entry.id ? (
                              '...'
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="space-y-2">
                          {entry.items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                  {item.quantity} {item.unit} {item.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                                <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-mono">
                                  {Math.round(item.calories)} cal
                                </span>
                                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded font-mono">
                                  P {Math.round(item.protein_g)}g
                                </span>
                                <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded font-mono">
                                  C {Math.round(item.carbs_g)}g
                                </span>
                                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-mono">
                                  F {Math.round(item.fat_g)}g
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Activity entries */}
          {dayLog.activities.length > 0 && (
            <div className="rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
              <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Activities
                  </h3>
                </div>
                <span className="text-sm font-mono font-bold text-blue-500">
                  {Math.round(
                    dayLog.activities.reduce((s, a) => s + a.calories_burned, 0)
                  )}{' '}
                  kcal burned
                </span>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {dayLog.activities.map((activity) => (
                  <div key={activity.id} className="px-6 py-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {activity.activity_name}
                      </span>
                      <span className="text-xs text-slate-400 ml-2">{activity.duration_minutes} min</span>
                    </div>
                    <span className="text-sm font-mono font-bold text-blue-500">
                      -{Math.round(activity.calories_burned)} kcal
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {dayLog.entries.length === 0 && dayLog.activities.length === 0 && (
            <div className="rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 p-12 text-center">
              <div className="flex justify-center mb-3">
                <Coffee className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300 mb-1">
                No Entries Yet
              </h3>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                {isToday
                  ? 'Use the Log Food tab to start tracking your meals.'
                  : 'No meals or activities were logged on this day.'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
