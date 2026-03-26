'use client';

import { useState } from 'react';
import { User, DailyGoals } from '@/types';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { Watch, Lock } from 'lucide-react';

interface SettingsProps {
  user: User;
  onUpdate: (user: User) => void;
}

interface ProfileForm {
  name: string;
  age: string;
  sex: 'male' | 'female' | 'other';
  heightFt: string;
  heightIn: string;
  weightLbs: string;
  goal_weight_lbs: string;
  activity_level: User['activity_level'];
  primary_goal: User['primary_goal'];
}

interface GoalsForm {
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
}

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary (little or no exercise)',
  lightly_active: 'Lightly Active (1-3 days/week)',
  moderately_active: 'Moderately Active (3-5 days/week)',
  very_active: 'Very Active (6-7 days/week)',
};

const GOAL_LABELS: Record<string, string> = {
  lose_weight: 'Lose Weight',
  maintain: 'Maintain Weight',
  build_muscle: 'Build Muscle',
};

function kgToLbs(kg: number): string {
  return Math.round(kg * 2.20462).toString();
}

function cmToFtIn(cm: number): { ft: string; in: string } {
  const feet = Math.floor(cm / 30.48);
  const inches = Math.round((cm % 30.48) / 2.54);
  return { ft: feet.toString(), in: inches.toString() };
}

function calculateGoalsFromProfile(
  p: ProfileForm
): GoalsForm {
  const weight_kg =
    (parseFloat(p.weightLbs) || 154) * 0.453592;
  const height_cm =
    (parseFloat(p.heightFt) || 5) * 30.48 +
    (parseFloat(p.heightIn) || 10) * 2.54;
  const age = parseFloat(p.age) || 30;

  const bmr =
    p.sex === 'male'
      ? 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
      : 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;

  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
  };
  const tdee = bmr * (multipliers[p.activity_level] || 1.2);
  const adjustments: Record<string, number> = {
    lose_weight: -500,
    maintain: 0,
    build_muscle: 300,
  };
  const calories = Math.round(tdee + (adjustments[p.primary_goal] || 0));
  const weight_lbs = weight_kg * 2.205;
  const proteinRatios: Record<string, number> = {
    lose_weight: 0.6,
    maintain: 0.7,
    build_muscle: 0.8,
  };
  const protein_g = Math.round(weight_lbs * (proteinRatios[p.primary_goal] || 0.7));
  const fat_g = Math.round((calories * 0.25) / 9);
  const carbs_g = Math.round((calories - protein_g * 4 - fat_g * 9) / 4);

  return {
    calories: calories.toString(),
    protein_g: protein_g.toString(),
    carbs_g: carbs_g.toString(),
    fat_g: fat_g.toString(),
  };
}

export default function Settings({ user, onUpdate }: SettingsProps) {
  const initialHeight = cmToFtIn(user.height_cm);

  const [profileForm, setProfileForm] = useState<ProfileForm>({
    name: user.name,
    age: user.age.toString(),
    sex: user.sex,
    heightFt: initialHeight.ft,
    heightIn: initialHeight.in,
    weightLbs: kgToLbs(user.weight_kg),
    goal_weight_lbs: user.goal_weight_kg ? kgToLbs(user.goal_weight_kg) : '',
    activity_level: user.activity_level,
    primary_goal: user.primary_goal,
  });

  const [goalsForm, setGoalsForm] = useState<GoalsForm>({
    calories: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
  });

  const [goalsLoaded, setGoalsLoaded] = useState(false);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [activeSection, setActiveSection] = useState<'profile' | 'goals' | 'wearable' | 'danger'>('profile');

  const inputClass =
    'w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm';
  const labelClass =
    'block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5';

  const updateProfile = (field: keyof ProfileForm, value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateGoals = (field: keyof GoalsForm, value: string) => {
    setGoalsForm((prev) => ({ ...prev, [field]: value }));
  };

  const loadGoals = async () => {
    setLoadingGoals(true);
    try {
      const res = await fetch(`/api/goals?user_id=${user.id}`);
      if (res.ok) {
        const data: DailyGoals = await res.json();
        setGoalsForm({
          calories: data.calories.toString(),
          protein_g: data.protein_g.toString(),
          carbs_g: data.carbs_g.toString(),
          fat_g: data.fat_g.toString(),
        });
      }
      setGoalsLoaded(true);
    } catch {
      setGoalsLoaded(true);
    } finally {
      setLoadingGoals(false);
    }
  };

  const handleRecalculate = () => {
    const newGoals = calculateGoalsFromProfile(profileForm);
    setGoalsForm(newGoals);
    setGoalsLoaded(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const height_cm =
        parseFloat(profileForm.heightFt) * 30.48 + parseFloat(profileForm.heightIn) * 2.54;
      const weight_kg = parseFloat(profileForm.weightLbs) * 0.453592;
      const goal_weight_kg = profileForm.goal_weight_lbs
        ? parseFloat(profileForm.goal_weight_lbs) * 0.453592
        : null;

      const profileRes = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          name: profileForm.name.trim(),
          age: parseInt(profileForm.age),
          sex: profileForm.sex,
          height_cm: Math.round(height_cm * 10) / 10,
          weight_kg: Math.round(weight_kg * 10) / 10,
          goal_weight_kg,
          activity_level: profileForm.activity_level,
          primary_goal: profileForm.primary_goal,
        }),
      });
      if (!profileRes.ok) throw new Error('Failed to update profile');
      const { user: updatedUser } = await profileRes.json();

      if (goalsLoaded) {
        const goalsRes = await fetch('/api/goals', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            calories: parseInt(goalsForm.calories),
            protein_g: parseInt(goalsForm.protein_g),
            carbs_g: parseInt(goalsForm.carbs_g),
            fat_g: parseInt(goalsForm.fat_g),
          }),
        });
        if (!goalsRes.ok) throw new Error('Failed to update goals');
      }

      onUpdate(updatedUser);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      setSaveError(e.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { key: 'profile' as const, label: 'Profile' },
    { key: 'goals' as const, label: 'Daily Goals' },
    { key: 'wearable' as const, label: 'Wearables' },
    { key: 'danger' as const, label: 'Danger Zone' },
  ];

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 flex gap-1 overflow-x-auto">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => {
              setActiveSection(s.key);
              if (s.key === 'goals' && !goalsLoaded) loadGoals();
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeSection === s.key
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Profile Section */}
      {activeSection === 'profile' && (
        <div className="rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
            Profile Settings
          </h2>

          <div>
            <label className={labelClass}>Name</label>
            <input
              type="text"
              className={inputClass}
              value={profileForm.name}
              onChange={(e) => updateProfile('name', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Age</label>
              <input
                type="number"
                className={inputClass}
                value={profileForm.age}
                min="13"
                max="120"
                onChange={(e) => updateProfile('age', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Biological Sex</label>
              <select
                className={inputClass}
                value={profileForm.sex}
                onChange={(e) => updateProfile('sex', e.target.value as 'male' | 'female' | 'other')}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Height</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="number"
                  className={inputClass}
                  value={profileForm.heightFt}
                  min="3"
                  max="8"
                  onChange={(e) => updateProfile('heightFt', e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">ft</span>
              </div>
              <div className="flex-1 relative">
                <input
                  type="number"
                  className={inputClass}
                  value={profileForm.heightIn}
                  min="0"
                  max="11"
                  onChange={(e) => updateProfile('heightIn', e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">in</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Weight (lbs)</label>
              <div className="relative">
                <input
                  type="number"
                  className={inputClass}
                  value={profileForm.weightLbs}
                  min="50"
                  max="700"
                  onChange={(e) => updateProfile('weightLbs', e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">lbs</span>
              </div>
            </div>
            <div>
              <label className={labelClass}>
                Goal Weight{' '}
                <span className="normal-case font-normal text-slate-400">(optional)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  className={inputClass}
                  value={profileForm.goal_weight_lbs}
                  min="50"
                  max="700"
                  onChange={(e) => updateProfile('goal_weight_lbs', e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">lbs</span>
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>Activity Level</label>
            <div className="space-y-2">
              {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => updateProfile('activity_level', value)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors border ${
                    profileForm.activity_level === value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Primary Goal</label>
            <div className="flex gap-3">
              {Object.entries(GOAL_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => updateProfile('primary_goal', value)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    profileForm.primary_goal === value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Goals Section */}
      {activeSection === 'goals' && (
        <div className="rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
              Daily Goals
            </h2>
            <button
              onClick={handleRecalculate}
              className="px-3 py-1.5 text-xs rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-medium transition-colors"
            >
              Recalculate from Profile
            </button>
          </div>

          {loadingGoals ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { field: 'calories', label: 'Daily Calories', unit: 'kcal', color: 'text-red-500' },
                { field: 'protein_g', label: 'Protein (g)', unit: 'g', color: 'text-green-500' },
                { field: 'carbs_g', label: 'Carbohydrates (g)', unit: 'g', color: 'text-orange-500' },
                { field: 'fat_g', label: 'Fat (g)', unit: 'g', color: 'text-blue-500' },
              ].map(({ field, label, unit, color }) => (
                <div key={field}>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${color}`}>
                    {label}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      className={inputClass}
                      value={goalsForm[field as keyof GoalsForm]}
                      min="0"
                      onChange={(e) => updateGoals(field as keyof GoalsForm, e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                      {unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Wearable Section */}
      {activeSection === 'wearable' && (
        <div className="rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
            Wearable Integration
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Connect your wearable device to automatically sync recovery, sleep, and workout data.
          </p>

          {/* Whoop card */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-5 space-y-3 opacity-70">
            <div className="flex items-center gap-3">
              <Watch className="h-6 w-6 text-slate-500 dark:text-slate-400" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Connect Wearable Device</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Recovery, sleep & workout data</p>
              </div>
              <Lock className="h-4 w-4 text-slate-400 ml-auto" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Whoop integration coming soon — connect your device to automatically sync recovery,
              sleep, and workout data.
            </p>
            <div className="relative inline-block group">
              <button
                disabled
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-sm font-medium opacity-50 cursor-not-allowed"
              >
                Connect Whoop
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-xs rounded-lg px-3 py-1.5 whitespace-nowrap shadow-lg">
                Coming soon!
              </div>
            </div>
          </div>

          {/* Other integrations */}
          <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              More integrations coming soon
            </h3>
            <div className="flex flex-wrap gap-2">
              {['Fitbit', 'Apple Health', 'Garmin', 'Oura Ring'].map((name) => (
                <span
                  key={name}
                  className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs rounded-full"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      {activeSection === 'danger' && (
        <div className="rounded-lg shadow-sm border border-red-200 dark:border-red-800 bg-white dark:bg-slate-800 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">
            Danger Zone
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Irreversible actions — proceed with caution.
          </p>
          <div className="rounded-lg border border-red-200 dark:border-red-800 p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Reset All Data</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Permanently delete all your logs and profile data
              </p>
            </div>
            <div className="relative group">
              <button
                disabled
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium opacity-40 cursor-not-allowed"
              >
                Reset Data
              </button>
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-slate-800 text-white text-xs rounded-lg px-3 py-1.5 whitespace-nowrap shadow-lg">
                Coming soon
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save button (profile + goals sections) */}
      {(activeSection === 'profile' || activeSection === 'goals') && (
        <div className="space-y-2">
          {saveError && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              {saveError}
            </p>
          )}
          {saveSuccess && (
            <p className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
              Settings saved successfully!
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Saving...</span>
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
