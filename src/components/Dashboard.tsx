'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Flame, TrendingUp, Trophy, Zap } from 'lucide-react';
import { User, WeeklySummary, WeightLogEntry, WorkoutPerformance } from '@/types';
import { MacroBar } from './ui/MacroBar';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface DashboardProps {
  user: User;
}

interface PRRecord {
  weight_lbs?: number;
  time_seconds?: number;
  date: string;
}

function formatPrValue(pr: PRRecord): string {
  if (pr.weight_lbs != null) return `${pr.weight_lbs} lbs`;
  if (pr.time_seconds != null) {
    const m = Math.floor(pr.time_seconds / 60);
    const s = pr.time_seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  return '-';
}

export default function Dashboard({ user }: DashboardProps) {
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // AI insight
  const [insight, setInsight] = useState<string>('');
  const [insightLoading, setInsightLoading] = useState(false);

  // Weight log
  const [weightEntries, setWeightEntries] = useState<WeightLogEntry[]>([]);
  const [weightLoading, setWeightLoading] = useState(true);
  const [weightDate, setWeightDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [weightValue, setWeightValue] = useState('');
  const [weightSaving, setWeightSaving] = useState(false);
  const [weightSaved, setWeightSaved] = useState(false);
  const [weightError, setWeightError] = useState('');

  // Today's activity minutes
  const [todayActivityMinutes, setTodayActivityMinutes] = useState<number | null>(null);
  const [activityMinutesLoading, setActivityMinutesLoading] = useState(true);

  // Workout PRs
  const [prs, setPrs] = useState<Record<string, PRRecord>>({});
  const [prsLoading, setPrsLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/dashboard/summary?user_id=${user.id}`);
      if (!res.ok) throw new Error('Failed to load dashboard');
      const data = await res.json();
      setSummary(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  const fetchWeightLog = useCallback(async () => {
    setWeightLoading(true);
    try {
      const res = await fetch('/api/weight-log');
      if (!res.ok) throw new Error('Failed to load weight log');
      const data = await res.json();
      setWeightEntries(data.entries || []);
    } catch {
      // silently fail
    } finally {
      setWeightLoading(false);
    }
  }, []);

  const fetchActivityMinutes = useCallback(async () => {
    setActivityMinutesLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const res = await fetch(`/api/log/${today}?user_id=${user.id}`);
      if (!res.ok) {
        setTodayActivityMinutes(0);
        return;
      }
      const data = await res.json();
      const activities = data.activities || [];
      const total = activities.reduce(
        (sum: number, a: { duration_minutes?: number }) => sum + (a.duration_minutes || 0),
        0
      );
      setTodayActivityMinutes(total);
    } catch {
      setTodayActivityMinutes(0);
    } finally {
      setActivityMinutesLoading(false);
    }
  }, [user.id]);

  const fetchPrs = useCallback(async () => {
    setPrsLoading(true);
    try {
      const res = await fetch('/api/workout-performance');
      if (!res.ok) throw new Error('Failed to load PRs');
      const data = await res.json();
      setPrs(data.prs || {});
    } catch {
      // silently fail
    } finally {
      setPrsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    fetchWeightLog();
    fetchActivityMinutes();
    fetchPrs();
  }, [fetchSummary, fetchWeightLog, fetchActivityMinutes, fetchPrs]);

  const fetchInsight = async () => {
    setInsightLoading(true);
    try {
      const res = await fetch('/api/dashboard/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      if (!res.ok) throw new Error('Failed to get insight');
      const data = await res.json();
      setInsight(data.insight || data.message || '');
    } catch {
      setInsight('Could not generate insight. Please try again.');
    } finally {
      setInsightLoading(false);
    }
  };

  const handleLogWeight = async () => {
    if (!weightValue || !weightDate) return;
    setWeightSaving(true);
    setWeightError('');
    setWeightSaved(false);
    try {
      const res = await fetch('/api/weight-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: weightDate, weight_lbs: parseFloat(weightValue) }),
      });
      if (!res.ok) throw new Error('Failed to save weight');
      setWeightSaved(true);
      setWeightValue('');
      await fetchWeightLog();
    } catch (e: unknown) {
      setWeightError(e instanceof Error ? e.message : 'Could not save weight.');
    } finally {
      setWeightSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-slate-500 dark:text-slate-400 text-sm">Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
        <p className="text-red-600 dark:text-red-400 mb-3">{error}</p>
        <button
          onClick={fetchSummary}
          className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!summary) return null;

  const { today, week, streak, goals, bmr, tdee } = summary;

  const netCalories = today.calories_consumed - today.calories_burned;
  const isDeficit = netCalories < 0;
  const isExcessiveDeficit = isDeficit && Math.abs(netCalories) > 700;
  const netColor =
    user.primary_goal === 'build_muscle'
      ? netCalories > 0
        ? 'text-green-500'
        : 'text-orange-500'
      : isExcessiveDeficit
      ? 'text-red-500'
      : isDeficit
      ? 'text-green-500'
      : 'text-orange-500';

  // Weekly chart data
  const chartData = week.map((day) => ({
    name: format(new Date(day.date + 'T12:00:00'), 'EEE'),
    'Calories In': Math.round(day.calories_consumed),
    'Calories Burned': Math.round(day.calories_burned),
  }));

  // Rolling averages
  const avgIn = Math.round(week.reduce((s, d) => s + d.calories_consumed, 0) / (week.length || 1));
  const avgOut = Math.round(week.reduce((s, d) => s + d.calories_burned, 0) / (week.length || 1));
  const avgNet = Math.round(week.reduce((s, d) => s + d.net_calories, 0) / (week.length || 1));

  // Weight chart data - last 30 days
  const last30Weight = weightEntries.slice(-30);
  const weightChartData = last30Weight.map((e) => ({
    date: format(new Date(e.date + 'T12:00:00'), 'MMM d'),
    weight: e.weight_lbs,
  }));

  // Current weight: most recent log or profile fallback
  const currentWeightLbs =
    weightEntries.length > 0
      ? weightEntries[weightEntries.length - 1].weight_lbs
      : Math.round(user.weight_kg * 2.20462 * 10) / 10;

  const prEntries = Object.entries(prs);

  return (
    <div className="space-y-4">
      {/* Streak */}
      {streak > 0 && (
        <div className="rounded-lg shadow-sm border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 flex items-center gap-3">
          <Flame size={20} className="text-amber-500 flex-shrink-0" />
          <div>
            <span className="font-bold text-amber-700 dark:text-amber-300">{streak}-day logging streak!</span>
            <span className="text-sm text-amber-600 dark:text-amber-400 ml-2">Keep it up.</span>
          </div>
        </div>
      )}

      {/* Today's Summary */}
      <div className="rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <h2 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Today&apos;s Summary</h2>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-3xl font-mono font-bold text-red-500">
              {Math.round(today.calories_consumed)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Calories In</div>
          </div>
          <div className="text-center border-x border-slate-100 dark:border-slate-700">
            <div className="text-3xl font-mono font-bold text-blue-500">
              {Math.round(today.calories_burned)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Calories Burned</div>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-mono font-bold ${netColor}`}>
              {netCalories > 0 ? '+' : ''}{Math.round(netCalories)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Net Balance</div>
          </div>
        </div>

        <div className="space-y-3">
          <MacroBar
            label="Calories"
            current={today.calories_consumed}
            goal={goals.calories}
            unit=" kcal"
            colorClass="bg-red-500"
            textColorClass="text-red-500"
          />
          <MacroBar
            label="Protein"
            current={today.protein_g}
            goal={goals.protein_g}
            colorClass="bg-green-500"
            textColorClass="text-green-500"
          />
          <MacroBar
            label="Carbs"
            current={today.carbs_g}
            goal={goals.carbs_g}
            colorClass="bg-orange-500"
            textColorClass="text-orange-500"
          />
          <MacroBar
            label="Fat"
            current={today.fat_g}
            goal={goals.fat_g}
            colorClass="bg-blue-500"
            textColorClass="text-blue-500"
          />
          <MacroBar
            label="Fiber"
            current={today.fiber_g}
            goal={25}
            colorClass="bg-purple-500"
            textColorClass="text-purple-500"
          />
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span>BMR: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{Math.round(bmr)} kcal</span></span>
          <span>TDEE: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{Math.round(tdee)} kcal</span></span>
        </div>
      </div>

      {/* Weight Trend Card */}
      <div className="rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-500" />
            <h2 className="font-bold text-slate-900 dark:text-slate-100">Weight Trend</h2>
          </div>
          {currentWeightLbs != null && (
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-lg">
              {currentWeightLbs} lbs
            </span>
          )}
        </div>

        {weightLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : weightChartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={weightChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis
                tick={{ fontSize: 11 }}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg, #fff)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${value} lbs`, 'Weight']}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">
            Log at least 2 weight entries to see your trend.
          </p>
        )}

        {/* Quick weight entry */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            Log Weight
          </p>
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Date</label>
              <input
                type="date"
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                value={weightDate}
                onChange={(e) => { setWeightDate(e.target.value); setWeightSaved(false); }}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Weight (lbs)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="w-28 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                placeholder="185.0"
                value={weightValue}
                onChange={(e) => { setWeightValue(e.target.value); setWeightSaved(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleLogWeight(); }}
              />
            </div>
            <button
              onClick={handleLogWeight}
              disabled={weightSaving || !weightValue}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {weightSaving ? <LoadingSpinner size="sm" /> : null}
              {weightSaving ? 'Saving...' : 'Log Weight'}
            </button>
            {weightSaved && (
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">Saved!</span>
            )}
          </div>
          {weightError && <p className="text-sm text-red-500 mt-2">{weightError}</p>}
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <h2 className="font-bold text-slate-900 dark:text-slate-100 mb-4">7-Day Overview</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg, #fff)',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="Calories In" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Calories Burned" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        {/* Rolling averages */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-mono font-bold text-red-500">{avgIn}</div>
            <div className="text-xs text-slate-400">Avg In</div>
          </div>
          <div>
            <div className="text-lg font-mono font-bold text-blue-500">{avgOut}</div>
            <div className="text-xs text-slate-400">Avg Burned</div>
          </div>
          <div>
            <div className={`text-lg font-mono font-bold ${avgNet > 0 ? 'text-orange-500' : 'text-green-500'}`}>
              {avgNet > 0 ? '+' : ''}{avgNet}
            </div>
            <div className="text-xs text-slate-400">Avg Net</div>
          </div>
        </div>
      </div>

      {/* Today's Activity Minutes */}
      <div className="rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Today&apos;s Active Minutes
        </p>
        {activityMinutesLoading ? (
          <div className="flex justify-center py-4">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-mono font-bold text-indigo-600 dark:text-indigo-400">
              {todayActivityMinutes ?? 0}
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-sm">min</span>
          </div>
        )}
      </div>

      {/* AI Insight */}
      <div className="rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-blue-500" />
            <h2 className="font-bold text-slate-900 dark:text-slate-100">AI Insight</h2>
          </div>
          <button
            onClick={fetchInsight}
            disabled={insightLoading}
            className="px-3 py-1.5 text-xs rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {insightLoading && <LoadingSpinner size="sm" />}
            {insightLoading ? 'Generating...' : 'Refresh Insight'}
          </button>
        </div>
        {insight ? (
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{insight}</p>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500 italic">
            Click &quot;Refresh Insight&quot; to get a personalized AI recommendation based on your recent data.
          </p>
        )}
      </div>

      {/* Workout PRs Card */}
      <div className="rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={16} className="text-amber-500" />
          <h2 className="font-bold text-slate-900 dark:text-slate-100">Personal Records</h2>
        </div>
        {prsLoading ? (
          <div className="flex justify-center py-6">
            <LoadingSpinner />
          </div>
        ) : prEntries.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Log workouts in the Activity tab to track your PRs.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {prEntries.map(([exercise, pr]) => (
              <div
                key={exercise}
                className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-3"
              >
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-tight mb-1">
                  {exercise}
                </div>
                <div className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {formatPrValue(pr)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
