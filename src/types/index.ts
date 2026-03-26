export interface User {
  id: number;
  name: string;
  age: number;
  sex: 'male' | 'female' | 'other';
  height_cm: number;
  weight_kg: number;
  goal_weight_kg?: number;
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
  primary_goal: 'lose_weight' | 'maintain' | 'build_muscle';
  created_at: string;
}

export interface DailyGoals {
  id: number;
  user_id: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface FoodItem {
  id?: number;
  entry_id?: number;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sugar_g: number;
  fiber_g: number;
}

export interface FoodLogEntry {
  id: number;
  user_id: number;
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  raw_input: string;
  confirmed_at: string;
  items: FoodItem[];
}

export interface ParsedFood {
  foods: FoodItem[];
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  confidence: number;
}

export interface ActivityEntry {
  id: number;
  user_id: number;
  date: string;
  raw_input?: string;
  activity_name: string;
  duration_minutes: number;
  calories_burned: number;
  met_value?: number;
  source: string;
  created_at: string;
}

export interface ParsedActivity {
  activity_name: string;
  duration_minutes: number;
  estimated_calories_burned: number;
  met_value: number;
}

export interface DailySummary {
  date: string;
  calories_consumed: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sugar_g: number;
  fiber_g: number;
  calories_burned: number;
  net_calories: number;
}

export interface WeeklySummary {
  today: DailySummary;
  week: DailySummary[];
  streak: number;
  goals: DailyGoals;
  bmr: number;
  tdee: number;
}

export interface WeightLogEntry {
  id: number;
  user_id: number;
  date: string;
  weight_lbs: number;
  created_at: string;
}

export interface WorkoutPerformance {
  id: number;
  user_id: number;
  date: string;
  exercise_name: string;
  exercise_type: 'run' | 'lift' | 'cardio';
  distance_miles?: number;
  time_seconds?: number;
  weight_lbs?: number;
  reps?: number;
  sets?: number;
  notes?: string;
  created_at: string;
}
