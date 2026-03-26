import { User } from '@/types';

/**
 * Calculate Basal Metabolic Rate using the Mifflin-St Jeor equation.
 * - Male:   (10 × weight_kg) + (6.25 × height_cm) - (5 × age) + 5
 * - Female: (10 × weight_kg) + (6.25 × height_cm) - (5 × age) - 161
 * - Other:  average of male and female values
 */
export function calculateBMR(user: User): number {
  const base = 10 * user.weight_kg + 6.25 * user.height_cm - 5 * user.age;
  if (user.sex === 'male') {
    return base + 5;
  } else if (user.sex === 'female') {
    return base - 161;
  } else {
    // 'other': average of male and female
    const male = base + 5;
    const female = base - 161;
    return (male + female) / 2;
  }
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
};

/**
 * Calculate Total Daily Energy Expenditure from BMR and activity level.
 */
export function calculateTDEE(bmr: number, activityLevel: string): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.2;
  return bmr * multiplier;
}

/**
 * Calculate suggested daily macro goals based on user profile and primary goal.
 *
 * Calories:
 *   - lose_weight:   TDEE - 500
 *   - maintain:      TDEE
 *   - build_muscle:  TDEE + 300
 *
 * Protein (grams per pound of bodyweight):
 *   - build_muscle:  0.8 g/lb
 *   - lose_weight:   0.6 g/lb
 *   - maintain:      0.7 g/lb
 *
 * Fat: 25% of target calories / 9 kcal per gram
 * Carbs: remaining calories / 4 kcal per gram
 */
export function calculateDailyGoals(user: User): {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
} {
  const bmr = calculateBMR(user);
  const tdee = calculateTDEE(bmr, user.activity_level);

  let calorieAdjustment = 0;
  if (user.primary_goal === 'lose_weight') {
    calorieAdjustment = -500;
  } else if (user.primary_goal === 'build_muscle') {
    calorieAdjustment = 300;
  }

  const calories = Math.round(tdee + calorieAdjustment);

  const weightLbs = user.weight_kg * 2.205;
  let proteinPerLb = 0.7;
  if (user.primary_goal === 'build_muscle') {
    proteinPerLb = 0.8;
  } else if (user.primary_goal === 'lose_weight') {
    proteinPerLb = 0.6;
  }
  const protein_g = Math.round(weightLbs * proteinPerLb);

  const fat_g = Math.round((calories * 0.25) / 9);

  const proteinCalories = protein_g * 4;
  const fatCalories = fat_g * 9;
  const remainingCalories = calories - proteinCalories - fatCalories;
  const carbs_g = Math.round(remainingCalories / 4);

  return {
    calories,
    protein_g,
    carbs_g: Math.max(carbs_g, 0),
    fat_g,
  };
}
