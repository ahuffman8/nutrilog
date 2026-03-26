'use client';

import { useState } from 'react';
import { User, FoodItem, ParsedFood } from '@/types';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { Coffee, Sun, Moon, Apple, Zap, Check, RotateCcw, Trash2 } from 'lucide-react';

interface FoodLoggerProps {
  user: User;
  onLogged?: () => void;
}

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const MEAL_ICONS: Record<MealType, React.ReactNode> = {
  breakfast: <Coffee className="h-4 w-4" />,
  lunch: <Sun className="h-4 w-4" />,
  dinner: <Moon className="h-4 w-4" />,
  snack: <Apple className="h-4 w-4" />,
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function getMealTypeForTime(): MealType {
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 14) return 'lunch';
  if (hour < 19) return 'dinner';
  return 'snack';
}

export default function FoodLogger({ user, onLogged }: FoodLoggerProps) {
  const [input, setInput] = useState('');
  const [mealType, setMealType] = useState<MealType>(getMealTypeForTime());
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parseError, setParseError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [parsed, setParsed] = useState<ParsedFood | null>(null);
  const [editedItems, setEditedItems] = useState<FoodItem[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [saved, setSaved] = useState(false);

  const handleParse = async () => {
    if (!input.trim()) return;
    setParsing(true);
    setParseError('');
    setParsed(null);
    setSaved(false);
    try {
      const res = await fetch('/api/parse-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, meal_type: mealType, user_id: user.id }),
      });
      if (!res.ok) throw new Error('Failed to parse food');
      const data: ParsedFood = await res.json();
      setParsed(data);
      setEditedItems(data.foods.map((f, i) => ({ ...f, id: i })));
      setConfidence(data.confidence);
      if (data.meal_type) setMealType(data.meal_type);
    } catch (e: any) {
      setParseError(e.message || 'Could not parse your food. Please try again.');
    } finally {
      setParsing(false);
    }
  };

  const updateItem = (index: number, field: keyof FoodItem, value: string | number) => {
    setEditedItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setEditedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setEditedItems((prev) => [
      ...prev,
      {
        name: '',
        quantity: 1,
        unit: 'serving',
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        sugar_g: 0,
        fiber_g: 0,
      },
    ]);
  };

  const totalCalories = editedItems.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/log-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          date: new Date().toISOString().split('T')[0],
          meal_type: mealType,
          raw_input: input,
          items: editedItems.map((item) => ({
            name: item.name,
            quantity: Number(item.quantity),
            unit: item.unit,
            calories: Number(item.calories),
            protein_g: Number(item.protein_g),
            carbs_g: Number(item.carbs_g),
            fat_g: Number(item.fat_g),
            sugar_g: Number(item.sugar_g),
            fiber_g: Number(item.fiber_g),
          })),
        }),
      });
      if (!res.ok) throw new Error('Failed to save entry');
      setSaved(true);
      setInput('');
      setParsed(null);
      setEditedItems([]);
      onLogged?.();
    } catch (e: any) {
      setSaveError(e.message || 'Could not save your entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setParsed(null);
    setEditedItems([]);
    setParseError('');
    setSaveError('');
    setSaved(false);
  };

  const inputClass =
    'px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm';

  return (
    <div className="space-y-4">
      {/* Success state */}
      {saved && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-6 text-center">
          <div className="flex justify-center mb-3">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-green-700 dark:text-green-300 mb-1">
            Meal Logged
          </h3>
          <p className="text-sm text-green-600 dark:text-green-400 mb-4">
            {Math.round(totalCalories)} calories added to your diary.
          </p>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors"
          >
            Log Another Meal
          </button>
        </div>
      )}

      {/* Input section */}
      {!saved && (
        <div className="rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
            Log Food
          </h2>

          {/* Meal type selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Meal Type
            </label>
            <div className="flex gap-2 flex-wrap">
              {MEAL_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setMealType(type)}
                  disabled={!!parsed}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    mealType === type
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  } disabled:opacity-50`}
                >
                  {MEAL_ICONS[type]}
                  {capitalize(type)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
              What did you eat?
            </label>
            <textarea
              className="w-full px-3 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
              rows={4}
              placeholder="e.g., oatmeal with blueberries and a coffee with oat milk"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleParse();
              }}
              disabled={parsing || !!parsed}
            />
            <p className="text-xs text-slate-400 mt-1">Tip: Press Cmd+Enter to analyze</p>
          </div>

          {/* Parse button */}
          {!parsed && (
            <button
              onClick={handleParse}
              disabled={parsing || !input.trim()}
              className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {parsing ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Analyzing your food...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>Parse with AI</span>
                </>
              )}
            </button>
          )}

          {/* Parse error */}
          {parseError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {parseError}
            </div>
          )}
        </div>
      )}

      {/* Parsed results */}
      {parsed && !saved && (
        <div className="rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
              Parsed Items
            </h3>
            <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
              {Math.round(confidence * 100)}% confidence
            </span>
          </div>

          {/* Food items */}
          <div className="space-y-3">
            {editedItems.map((item, index) => (
              <div
                key={index}
                className="rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className={`${inputClass} flex-1 font-medium`}
                    value={item.name}
                    placeholder="Food name"
                    onChange={(e) => updateItem(index, 'name', e.target.value)}
                  />
                  <button
                    onClick={() => removeItem(index)}
                    className="h-7 w-7 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-0.5">Qty</label>
                    <input
                      type="number"
                      className={`${inputClass} w-full`}
                      value={item.quantity}
                      min="0"
                      step="0.5"
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-0.5">Unit</label>
                    <input
                      type="text"
                      className={`${inputClass} w-full`}
                      value={item.unit}
                      onChange={(e) => updateItem(index, 'unit', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {[
                    { field: 'calories', label: 'Cal', color: 'text-red-500' },
                    { field: 'protein_g', label: 'Protein', color: 'text-green-500' },
                    { field: 'carbs_g', label: 'Carbs', color: 'text-orange-500' },
                    { field: 'fat_g', label: 'Fat', color: 'text-blue-500' },
                    { field: 'sugar_g', label: 'Sugar', color: 'text-pink-500' },
                    { field: 'fiber_g', label: 'Fiber', color: 'text-purple-500' },
                  ].map(({ field, label, color }) => (
                    <div key={field}>
                      <label className={`block text-xs font-medium mb-0.5 ${color}`}>{label}</label>
                      <input
                        type="number"
                        className={`${inputClass} w-full`}
                        value={item[field as keyof FoodItem] as number}
                        min="0"
                        step="0.1"
                        onChange={(e) => updateItem(index, field as keyof FoodItem, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Add item */}
          <button
            onClick={addItem}
            className="w-full py-2 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-500 dark:hover:border-indigo-500 dark:hover:text-indigo-400 transition-colors"
          >
            + Add Item
          </button>

          {/* Total */}
          <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 flex justify-between items-center">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Total Calories</span>
            <span className="text-xl font-mono font-bold text-red-500">{Math.round(totalCalories)} kcal</span>
          </div>

          {/* Save error */}
          {saveError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {saveError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Try Again
            </button>
            <button
              onClick={handleSave}
              disabled={saving || editedItems.length === 0}
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
                  Confirm & Save
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
