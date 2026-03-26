'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Zap, Trophy, Timer, Dumbbell, Check, Plus } from 'lucide-react';
import { User, ParsedActivity, WorkoutPerformance } from '@/types';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface ActivityTrackerProps {
  user: User;
}

type ActiveTab = 'log' | 'run' | 'lift';

const PRESET_DISTANCES = [
  { label: '1 Mile', miles: 1, name: '1 Mile Run' },
  { label: '2 Miles', miles: 2, name: '2 Mile Run' },
  { label: '5K (3.1 mi)', miles: 3.10686, name: '5K Run' },
  { label: '10K (6.2 mi)', miles: 6.21371, name: '10K Run' },
];

const PRESET_EXERCISES = [
  'Bench Press',
  'Back Squat',
  'Deadlift',
  'Overhead Press',
  'Barbell Row',
  'Pull-ups',
  'Dumbbell Curl',
  'Lat Pulldown',
];

interface PRRecord {
  weight_lbs?: number;
  time_seconds?: number;
  date: string;
}

function formatPace(timeSeconds: number, distanceMiles: number): string {
  const paceMin = timeSeconds / distanceMiles / 60;
  const mins = Math.floor(paceMin);
  const secs = Math.round((paceMin - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')} /mi`;
}

function formatTime(timeSeconds: number): string {
  const h = Math.floor(timeSeconds / 3600);
  const m = Math.floor((timeSeconds % 3600) / 60);
  const s = timeSeconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ActivityTracker({ user }: ActivityTrackerProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('log');

  // ---- Log Activity state ----
  const [activityInput, setActivityInput] = useState('');
  const [activityParsing, setActivityParsing] = useState(false);
  const [parsedActivity, setParsedActivity] = useState<ParsedActivity | null>(null);
  const [activitySaving, setActivitySaving] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [activitySaved, setActivitySaved] = useState(false);

  // ---- Run Tracker state ----
  const [selectedDistance, setSelectedDistance] = useState<number | null>(null);
  const [selectedDistanceName, setSelectedDistanceName] = useState('');
  const [customMiles, setCustomMiles] = useState('');
  const [runMinutes, setRunMinutes] = useState('');
  const [runSeconds, setRunSeconds] = useState('');
  const [runDate, setRunDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [runSaving, setRunSaving] = useState(false);
  const [runSaved, setRunSaved] = useState(false);
  const [runIsPr, setRunIsPr] = useState(false);
  const [runError, setRunError] = useState('');
  const [recentRuns, setRecentRuns] = useState<WorkoutPerformance[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);

  // ---- Lift Tracker state ----
  const [selectedExercise, setSelectedExercise] = useState('');
  const [customExercise, setCustomExercise] = useState('');
  const [liftWeight, setLiftWeight] = useState('');
  const [liftReps, setLiftReps] = useState('');
  const [liftSets, setLiftSets] = useState('3');
  const [liftDate, setLiftDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [liftNotes, setLiftNotes] = useState('');
  const [liftSaving, setLiftSaving] = useState(false);
  const [liftSaved, setLiftSaved] = useState(false);
  const [liftIsPr, setLiftIsPr] = useState(false);
  const [liftPrLabel, setLiftPrLabel] = useState('');
  const [liftError, setLiftError] = useState('');
  const [recentLifts, setRecentLifts] = useState<WorkoutPerformance[]>([]);
  const [liftsLoading, setLiftsLoading] = useState(false);

  // ---- PR Overview state ----
  const [prs, setPrs] = useState<Record<string, PRRecord>>({});
  const [prsLoading, setPrsLoading] = useState(true);

  // ---- Fetch PRs on mount ----
  const fetchPrs = useCallback(async () => {
    setPrsLoading(true);
    try {
      const res = await fetch('/api/workout-performance');
      if (!res.ok) throw new Error('Failed to load PRs');
      const data = await res.json();
      setPrs(data.prs || {});
    } catch {
      // silently fail for PRs
    } finally {
      setPrsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrs();
  }, [fetchPrs]);

  // ---- Fetch recent runs ----
  const fetchRecentRuns = useCallback(async () => {
    setRunsLoading(true);
    try {
      const res = await fetch('/api/workout-performance');
      if (!res.ok) throw new Error('Failed to load runs');
      const data = await res.json();
      const runEntries: WorkoutPerformance[] = (data.entries || [])
        .filter((e: WorkoutPerformance) => e.exercise_type === 'run')
        .slice(0, 10);
      setRecentRuns(runEntries);
    } catch {
      // silently fail
    } finally {
      setRunsLoading(false);
    }
  }, []);

  // ---- Fetch recent lifts for selected exercise ----
  const fetchRecentLifts = useCallback(async (exerciseName: string) => {
    if (!exerciseName) return;
    setLiftsLoading(true);
    try {
      const res = await fetch(`/api/workout-performance?exercise_name=${encodeURIComponent(exerciseName)}`);
      if (!res.ok) throw new Error('Failed to load lifts');
      const data = await res.json();
      setRecentLifts(data.entries || []);
    } catch {
      // silently fail
    } finally {
      setLiftsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'run') fetchRecentRuns();
  }, [activeTab, fetchRecentRuns]);

  const effectiveExercise = selectedExercise === 'Custom' ? customExercise : selectedExercise;

  useEffect(() => {
    if (activeTab === 'lift' && effectiveExercise) {
      fetchRecentLifts(effectiveExercise);
    }
  }, [activeTab, effectiveExercise, fetchRecentLifts]);

  // ---- Log Activity handlers ----
  const handleParseActivity = async () => {
    if (!activityInput.trim()) return;
    setActivityParsing(true);
    setActivityError('');
    setParsedActivity(null);
    setActivitySaved(false);
    try {
      const res = await fetch('/api/parse-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: activityInput, user_weight_kg: user.weight_kg }),
      });
      if (!res.ok) throw new Error('Failed to parse activity');
      const data = await res.json();
      setParsedActivity(data);
    } catch (e: unknown) {
      setActivityError(e instanceof Error ? e.message : 'Could not parse activity.');
    } finally {
      setActivityParsing(false);
    }
  };

  const handleLogActivity = async () => {
    if (!parsedActivity) return;
    setActivitySaving(true);
    try {
      const res = await fetch('/api/log-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          date: format(new Date(), 'yyyy-MM-dd'),
          raw_input: activityInput,
          activity_name: parsedActivity.activity_name,
          duration_minutes: parsedActivity.duration_minutes,
          calories_burned: parsedActivity.estimated_calories_burned,
          met_value: parsedActivity.met_value,
        }),
      });
      if (!res.ok) throw new Error('Failed to save activity');
      setActivitySaved(true);
      setActivityInput('');
      setParsedActivity(null);
    } catch (e: unknown) {
      setActivityError(e instanceof Error ? e.message : 'Could not save activity.');
    } finally {
      setActivitySaving(false);
    }
  };

  // ---- Run Tracker handlers ----
  const effectiveDistanceMiles =
    selectedDistance !== null
      ? selectedDistance
      : customMiles
      ? parseFloat(customMiles)
      : null;

  const effectiveDistanceName =
    selectedDistance !== null
      ? selectedDistanceName
      : customMiles
      ? `${customMiles} mi Run`
      : '';

  const runTimeSeconds =
    runMinutes !== '' || runSeconds !== ''
      ? (parseInt(runMinutes || '0', 10) * 60) + parseInt(runSeconds || '0', 10)
      : null;

  const calculatedPace =
    effectiveDistanceMiles && runTimeSeconds && runTimeSeconds > 0 && effectiveDistanceMiles > 0
      ? formatPace(runTimeSeconds, effectiveDistanceMiles)
      : null;

  const handleSaveRun = async () => {
    if (!effectiveDistanceMiles || !runTimeSeconds || runTimeSeconds <= 0) return;
    setRunSaving(true);
    setRunError('');
    setRunSaved(false);
    setRunIsPr(false);
    try {
      const res = await fetch('/api/workout-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: runDate,
          exercise_name: effectiveDistanceName,
          exercise_type: 'run',
          distance_miles: effectiveDistanceMiles,
          time_seconds: runTimeSeconds,
          user_id: 1,
        }),
      });
      if (!res.ok) throw new Error('Failed to save run');
      const data = await res.json();
      setRunSaved(true);
      setRunIsPr(data.is_pr || false);
      await fetchRecentRuns();
      await fetchPrs();
    } catch (e: unknown) {
      setRunError(e instanceof Error ? e.message : 'Could not save run.');
    } finally {
      setRunSaving(false);
    }
  };

  // ---- Lift Tracker handlers ----
  const handleLogLift = async () => {
    if (!effectiveExercise || !liftWeight || !liftReps) return;
    setLiftSaving(true);
    setLiftError('');
    setLiftSaved(false);
    setLiftIsPr(false);
    try {
      const res = await fetch('/api/workout-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: liftDate,
          exercise_name: effectiveExercise,
          exercise_type: 'lift',
          weight_lbs: parseFloat(liftWeight),
          reps: parseInt(liftReps, 10),
          sets: parseInt(liftSets || '1', 10),
          notes: liftNotes || undefined,
          user_id: 1,
        }),
      });
      if (!res.ok) throw new Error('Failed to log lift');
      const data = await res.json();
      setLiftSaved(true);
      if (data.is_pr) {
        setLiftIsPr(true);
        setLiftPrLabel(`${liftWeight} lbs x ${liftReps} reps`);
      }
      await fetchRecentLifts(effectiveExercise);
      await fetchPrs();
    } catch (e: unknown) {
      setLiftError(e instanceof Error ? e.message : 'Could not log lift.');
    } finally {
      setLiftSaving(false);
    }
  };

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'log', label: 'Log Activity', icon: <Zap size={14} /> },
    { id: 'run', label: 'Run Tracker', icon: <Timer size={14} /> },
    { id: 'lift', label: 'Lift Tracker', icon: <Dumbbell size={14} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Log Activity Tab */}
      {activeTab === 'log' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            AI-Powered Activity Logger
          </p>

          {activitySaved && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2 text-sm text-green-600 dark:text-green-400">
              <Check size={14} />
              Activity logged successfully.
            </div>
          )}

          <textarea
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
            placeholder="Describe your workout (e.g., '45 min run', '1 hour weightlifting')"
            value={activityInput}
            onChange={(e) => {
              setActivityInput(e.target.value);
              setParsedActivity(null);
              setActivitySaved(false);
            }}
            disabled={activityParsing || activitySaving}
          />

          <button
            onClick={handleParseActivity}
            disabled={activityParsing || !activityInput.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {activityParsing ? <LoadingSpinner size="sm" /> : <Zap size={14} />}
            {activityParsing ? 'Parsing...' : 'Parse with AI'}
          </button>

          {activityError && (
            <p className="text-sm text-red-500">{activityError}</p>
          )}

          {parsedActivity && !activitySaved && (
            <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Parsed Result
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm capitalize">
                    {parsedActivity.activity_name}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Activity</div>
                </div>
                <div>
                  <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {parsedActivity.duration_minutes} min
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Duration</div>
                </div>
                <div>
                  <div className="font-mono font-bold text-orange-500">
                    {Math.round(parsedActivity.estimated_calories_burned)} kcal
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Burned</div>
                </div>
              </div>
              <button
                onClick={handleLogActivity}
                disabled={activitySaving}
                className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {activitySaving ? <LoadingSpinner size="sm" /> : <Check size={14} />}
                {activitySaving ? 'Saving...' : 'Log Activity'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Run Tracker Tab */}
      {activeTab === 'run' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 space-y-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Distance
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_DISTANCES.map((d) => (
                <button
                  key={d.name}
                  onClick={() => {
                    setSelectedDistance(d.miles);
                    setSelectedDistanceName(d.name);
                    setCustomMiles('');
                    setRunSaved(false);
                    setRunIsPr(false);
                  }}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    selectedDistance === d.miles && selectedDistanceName === d.name
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                  }`}
                >
                  {d.label}
                </button>
              ))}
              <button
                onClick={() => {
                  setSelectedDistance(null);
                  setSelectedDistanceName('');
                  setRunSaved(false);
                  setRunIsPr(false);
                }}
                className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  selectedDistance === null
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              >
                Custom
              </button>
            </div>

            {selectedDistance === null && (
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Distance (miles)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-32 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="3.1"
                  value={customMiles}
                  onChange={(e) => setCustomMiles(e.target.value)}
                />
              </div>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Time
              </p>
              <div className="flex items-center gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">MM</label>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    className="w-20 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-center font-mono"
                    placeholder="28"
                    value={runMinutes}
                    onChange={(e) => { setRunMinutes(e.target.value); setRunSaved(false); }}
                  />
                </div>
                <span className="text-slate-400 font-bold mt-4">:</span>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">SS</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    className="w-20 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-center font-mono"
                    placeholder="00"
                    value={runSeconds}
                    onChange={(e) => { setRunSeconds(e.target.value); setRunSaved(false); }}
                  />
                </div>
                {calculatedPace && (
                  <div className="ml-4 px-3 py-2 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                    <div className="text-xs text-slate-400">Pace</div>
                    <div className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 text-sm">
                      {calculatedPace}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Date</label>
              <input
                type="date"
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                value={runDate}
                onChange={(e) => setRunDate(e.target.value)}
              />
            </div>

            {runError && <p className="text-sm text-red-500">{runError}</p>}

            {runSaved && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2 text-sm text-green-600 dark:text-green-400">
                  <Check size={14} />
                  Saved!
                </div>
                {runIsPr && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 px-3 py-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                    <Trophy size={14} />
                    New Personal Record!
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleSaveRun}
              disabled={runSaving || !effectiveDistanceMiles || !runTimeSeconds || runTimeSeconds <= 0}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {runSaving ? <LoadingSpinner size="sm" /> : <Check size={14} />}
              {runSaving ? 'Saving...' : 'Save Run'}
            </button>
          </div>

          {/* Recent Runs */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Recent Runs
            </p>
            {runsLoading ? (
              <div className="flex justify-center py-6">
                <LoadingSpinner />
              </div>
            ) : recentRuns.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">No runs logged yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700">
                      <th className="text-left py-2 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Date</th>
                      <th className="text-left py-2 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Exercise</th>
                      <th className="text-right py-2 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Distance</th>
                      <th className="text-right py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {recentRuns.map((run) => (
                      <tr key={run.id}>
                        <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">
                          {format(new Date(run.date + 'T12:00:00'), 'MMM d, yyyy')}
                        </td>
                        <td className="py-2 pr-4 text-slate-700 dark:text-slate-200 font-medium">
                          {run.exercise_name}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono text-slate-600 dark:text-slate-300">
                          {run.distance_miles ? `${run.distance_miles.toFixed(2)} mi` : '-'}
                        </td>
                        <td className="py-2 text-right font-mono text-slate-700 dark:text-slate-200">
                          {run.time_seconds ? formatTime(run.time_seconds) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lift Tracker Tab */}
      {activeTab === 'lift' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 space-y-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select Exercise
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_EXERCISES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => {
                    setSelectedExercise(ex);
                    setLiftSaved(false);
                    setLiftIsPr(false);
                  }}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors text-left ${
                    selectedExercise === ex
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                  }`}
                >
                  {ex}
                </button>
              ))}
              <button
                onClick={() => {
                  setSelectedExercise('Custom');
                  setLiftSaved(false);
                  setLiftIsPr(false);
                }}
                className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  selectedExercise === 'Custom'
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              >
                <Plus size={13} />
                Custom
              </button>
            </div>

            {selectedExercise === 'Custom' && (
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Exercise Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="e.g., Romanian Deadlift"
                  value={customExercise}
                  onChange={(e) => setCustomExercise(e.target.value)}
                />
              </div>
            )}

            {selectedExercise && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Set Details
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Weight (lbs)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="2.5"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                      placeholder="135"
                      value={liftWeight}
                      onChange={(e) => { setLiftWeight(e.target.value); setLiftSaved(false); }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Reps
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                      placeholder="5"
                      value={liftReps}
                      onChange={(e) => { setLiftReps(e.target.value); setLiftSaved(false); }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Sets
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                      placeholder="3"
                      value={liftSets}
                      onChange={(e) => setLiftSets(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      value={liftDate}
                      onChange={(e) => setLiftDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Notes (optional)
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder="e.g., paused reps"
                      value={liftNotes}
                      onChange={(e) => setLiftNotes(e.target.value)}
                    />
                  </div>
                </div>

                {liftError && <p className="text-sm text-red-500">{liftError}</p>}

                {liftSaved && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2 text-sm text-green-600 dark:text-green-400">
                      <Check size={14} />
                      Logged!
                    </div>
                    {liftIsPr && (
                      <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 px-3 py-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                        <Trophy size={14} />
                        New PR: {liftPrLabel}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleLogLift}
                  disabled={liftSaving || !effectiveExercise || !liftWeight || !liftReps}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  {liftSaving ? <LoadingSpinner size="sm" /> : <Dumbbell size={14} />}
                  {liftSaving ? 'Logging...' : 'Log Set'}
                </button>
              </>
            )}
          </div>

          {/* Recent Lifts Table */}
          {effectiveExercise && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Recent: {effectiveExercise}
              </p>
              {liftsLoading ? (
                <div className="flex justify-center py-6">
                  <LoadingSpinner />
                </div>
              ) : recentLifts.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">No entries yet for this exercise.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700">
                        <th className="text-left py-2 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Date</th>
                        <th className="text-right py-2 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Weight</th>
                        <th className="text-right py-2 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Reps</th>
                        <th className="text-right py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Sets</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                      {recentLifts.map((lift) => (
                        <tr key={lift.id}>
                          <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">
                            {format(new Date(lift.date + 'T12:00:00'), 'MMM d, yyyy')}
                          </td>
                          <td className="py-2 pr-4 text-right font-mono text-slate-700 dark:text-slate-200">
                            {lift.weight_lbs != null ? `${lift.weight_lbs} lbs` : '-'}
                          </td>
                          <td className="py-2 pr-4 text-right font-mono text-slate-600 dark:text-slate-300">
                            {lift.reps ?? '-'}
                          </td>
                          <td className="py-2 text-right font-mono text-slate-600 dark:text-slate-300">
                            {lift.sets ?? '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Performance Overview - always visible */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={16} className="text-amber-500" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Personal Records
          </p>
        </div>
        {prsLoading ? (
          <div className="flex justify-center py-6">
            <LoadingSpinner />
          </div>
        ) : Object.keys(prs).length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Log workouts in the Activity tab to track your PRs.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(prs).map(([exercise, pr]) => (
              <div
                key={exercise}
                className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-3"
              >
                <div className="flex items-start gap-1.5">
                  <Trophy size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                      {exercise}
                    </div>
                    <div className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                      {pr.weight_lbs != null
                        ? `${pr.weight_lbs} lbs`
                        : pr.time_seconds != null
                        ? formatTime(pr.time_seconds)
                        : '-'}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {format(new Date(pr.date + 'T12:00:00'), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
