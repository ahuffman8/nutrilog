'use client';

import { useState } from 'react';
import { User } from '@/types';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { ChevronRight, Check, Dumbbell } from 'lucide-react';

interface OnboardingProps {
  onComplete: (user: User) => void;
}

interface FormData {
  name: string;
  age: string;
  sex: 'male' | 'female' | 'other';
  heightFt: string;
  heightIn: string;
  weightLbs: string;
  goal_weight_lbs: string;
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
  primary_goal: 'lose_weight' | 'maintain' | 'build_muscle';
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
}

interface CalculatedGoals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  bmr: number;
  tdee: number;
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

function calculateGoals(data: FormData): CalculatedGoals {
  const weight_kg = parseFloat(data.weightLbs) * 0.453592;
  const height_cm = parseFloat(data.heightFt) * 30.48 + parseFloat(data.heightIn) * 2.54;
  const age = parseFloat(data.age);

  const bmr =
    data.sex === 'male'
      ? 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
      : 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;

  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
  };
  const tdee = bmr * (multipliers[data.activity_level] || 1.2);

  const adjustments: Record<string, number> = {
    lose_weight: -500,
    maintain: 0,
    build_muscle: 300,
  };
  const calories = Math.round(tdee + (adjustments[data.primary_goal] || 0));

  const weight_lbs = weight_kg * 2.205;
  const proteinRatios: Record<string, number> = {
    lose_weight: 0.6,
    maintain: 0.7,
    build_muscle: 0.8,
  };
  const protein_g = Math.round(weight_lbs * (proteinRatios[data.primary_goal] || 0.7));
  const fat_g = Math.round((calories * 0.25) / 9);
  const carbs_g = Math.round((calories - protein_g * 4 - fat_g * 9) / 4);

  return { calories, protein_g, carbs_g, fat_g, bmr: Math.round(bmr), tdee: Math.round(tdee) };
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [calculatedGoals, setCalculatedGoals] = useState<CalculatedGoals | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    age: '',
    sex: 'male',
    heightFt: '',
    heightIn: '',
    weightLbs: '',
    goal_weight_lbs: '',
    activity_level: 'moderately_active',
    primary_goal: 'maintain',
    calories: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
  });

  const update = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    setError('');
    if (step === 1) {
      if (!formData.name.trim() || !formData.age) {
        setError('Please fill in your name and age.');
        return;
      }
    }
    if (step === 2) {
      if (!formData.heightFt || !formData.weightLbs) {
        setError('Please enter your height and weight.');
        return;
      }
    }
    if (step === 3) {
      const goals = calculateGoals(formData);
      setCalculatedGoals(goals);
      setFormData((prev) => ({
        ...prev,
        calories: goals.calories.toString(),
        protein_g: goals.protein_g.toString(),
        carbs_g: goals.carbs_g.toString(),
        fat_g: goals.fat_g.toString(),
      }));
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setError('');
    setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      const weight_kg = parseFloat(formData.weightLbs) * 0.453592;
      const height_cm =
        parseFloat(formData.heightFt) * 30.48 + parseFloat(formData.heightIn) * 2.54;
      const goal_weight_kg = formData.goal_weight_lbs
        ? parseFloat(formData.goal_weight_lbs) * 0.453592
        : undefined;

      const profileRes = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          age: parseInt(formData.age),
          sex: formData.sex,
          height_cm: Math.round(height_cm * 10) / 10,
          weight_kg: Math.round(weight_kg * 10) / 10,
          goal_weight_kg,
          activity_level: formData.activity_level,
          primary_goal: formData.primary_goal,
        }),
      });

      if (!profileRes.ok) throw new Error('Failed to create profile');
      const { user } = await profileRes.json();

      const goalsRes = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          calories: parseInt(formData.calories),
          protein_g: parseInt(formData.protein_g),
          carbs_g: parseInt(formData.carbs_g),
          fat_g: parseInt(formData.fat_g),
        }),
      });
      if (!goalsRes.ok) throw new Error('Failed to save goals');

      onComplete(user);
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm';
  const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Dumbbell className="h-6 w-6 text-indigo-400" />
            <span className="text-2xl font-black tracking-tight text-indigo-400">NUTRILOG</span>
          </div>
          <p className="text-slate-400 text-sm">AI-powered performance tracking</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  s < step
                    ? 'bg-indigo-600 text-white'
                    : s === step
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-900'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 4 && (
                <div
                  className={`h-0.5 w-8 mx-1 ${
                    s < step ? 'bg-indigo-600' : 'bg-slate-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-slate-400 mb-6">Step {step} of 4</p>

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                Tell Us About Yourself
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                This helps us calculate your personalized targets.
              </p>
              <div>
                <label className={labelClass}>Your Name</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g., Alex"
                  value={formData.name}
                  onChange={(e) => update('name', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Age</label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="e.g., 30"
                  min="13"
                  max="120"
                  value={formData.age}
                  onChange={(e) => update('age', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Biological Sex</label>
                <div className="flex gap-3">
                  {(['male', 'female', 'other'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => update('sex', s)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                        formData.sex === s
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1">Used only for BMR calculation</p>
              </div>
            </div>
          )}

          {/* Step 2: Height & Weight */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                Height & Weight
              </h2>
              <div>
                <label className={labelClass}>Height</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      className={inputClass}
                      placeholder="5"
                      min="3"
                      max="8"
                      value={formData.heightFt}
                      onChange={(e) => update('heightFt', e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">ft</span>
                  </div>
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      className={inputClass}
                      placeholder="10"
                      min="0"
                      max="11"
                      value={formData.heightIn}
                      onChange={(e) => update('heightIn', e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">in</span>
                  </div>
                </div>
              </div>
              <div>
                <label className={labelClass}>Weight (lbs)</label>
                <div className="relative">
                  <input
                    type="number"
                    className={inputClass}
                    placeholder="165"
                    min="50"
                    max="700"
                    value={formData.weightLbs}
                    onChange={(e) => update('weightLbs', e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">lbs</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Goals & Activity */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                Goals & Activity
              </h2>
              <div>
                <label className={labelClass}>
                  Goal Weight (lbs) <span className="normal-case font-normal text-slate-400">optional</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    className={inputClass}
                    placeholder="150"
                    value={formData.goal_weight_lbs}
                    onChange={(e) => update('goal_weight_lbs', e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">lbs</span>
                </div>
              </div>
              <div>
                <label className={labelClass}>Activity Level</label>
                <div className="space-y-2">
                  {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => update('activity_level', value)}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors border ${
                        formData.activity_level === value
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
                      onClick={() => update('primary_goal', value)}
                      className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors text-center ${
                        formData.primary_goal === value
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

          {/* Step 4: Review */}
          {step === 4 && calculatedGoals && (
            <div className="space-y-5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                Your Daily Targets
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Based on your profile, here are your suggested daily goals. Adjust as needed.
              </p>
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Metabolic Stats
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">BMR (base metabolic rate)</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {calculatedGoals.bmr} kcal
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">TDEE (with activity)</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {calculatedGoals.tdee} kcal
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { key: 'calories', label: 'Daily Calories', unit: 'kcal', color: 'text-red-500' },
                  { key: 'protein_g', label: 'Protein (g)', unit: 'g', color: 'text-green-500' },
                  { key: 'carbs_g', label: 'Carbohydrates (g)', unit: 'g', color: 'text-orange-500' },
                  { key: 'fat_g', label: 'Fat (g)', unit: 'g', color: 'text-blue-500' },
                ].map(({ key, label, unit, color }) => (
                  <div key={key} className="flex items-center gap-3">
                    <label className={`w-40 text-sm font-medium ${color}`}>{label}</label>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        className={inputClass}
                        value={formData[key as keyof FormData]}
                        onChange={(e) => update(key as keyof FormData, e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                        {unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="mt-4 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="flex-1 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Back
              </button>
            )}
            {step < 4 ? (
              <button
                onClick={handleNext}
                className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-1.5"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Get Started</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
