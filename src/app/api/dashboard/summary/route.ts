import { NextRequest, NextResponse } from 'next/server';
import { getDb, DbClient } from '@/lib/db';
import { calculateBMR, calculateTDEE } from '@/lib/calculations';
import { User, DailyGoals, DailySummary, WeeklySummary } from '@/types';

interface FoodTotalsRow {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sugar_g: number;
  fiber_g: number;
}

interface CaloriesBurnedRow {
  total: number;
}

interface EntryCountRow {
  count: number;
}

async function getDailySummary(
  db: DbClient,
  date: string,
  userId: number,
): Promise<DailySummary> {
  const foodTotals = await db.queryOne<FoodTotalsRow>(`
    SELECT
      COALESCE(SUM(fi.calories), 0) AS calories,
      COALESCE(SUM(fi.protein_g), 0) AS protein_g,
      COALESCE(SUM(fi.carbs_g), 0) AS carbs_g,
      COALESCE(SUM(fi.fat_g), 0) AS fat_g,
      COALESCE(SUM(fi.sugar_g), 0) AS sugar_g,
      COALESCE(SUM(fi.fiber_g), 0) AS fiber_g
    FROM food_items fi
    JOIN food_log_entries fle ON fi.entry_id = fle.id
    WHERE fle.user_id = ? AND fle.date = ?
  `, [userId, date]);

  const activityBurned = await db.queryOne<CaloriesBurnedRow>(`
    SELECT COALESCE(SUM(calories_burned), 0) AS total
    FROM activity_log
    WHERE user_id = ? AND date = ?
  `, [userId, date]);

  const caloriesConsumed = foodTotals?.calories ?? 0;
  const caloriesBurned = activityBurned?.total ?? 0;

  return {
    date,
    calories_consumed: caloriesConsumed,
    protein_g: foodTotals?.protein_g ?? 0,
    carbs_g: foodTotals?.carbs_g ?? 0,
    fat_g: foodTotals?.fat_g ?? 0,
    sugar_g: foodTotals?.sugar_g ?? 0,
    fiber_g: foodTotals?.fiber_g ?? 0,
    calories_burned: caloriesBurned,
    net_calories: caloriesConsumed - caloriesBurned,
  };
}

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const userId = parseInt(searchParams.get('user_id') ?? '1', 10);

    const user = await db.queryOne<User>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const goals = await db.queryOne<DailyGoals>('SELECT * FROM daily_goals WHERE user_id = ?', [userId]);
    if (!goals) {
      return NextResponse.json({ error: 'Daily goals not found' }, { status: 404 });
    }

    const bmr = calculateBMR(user);
    const tdee = calculateTDEE(bmr, user.activity_level);

    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const week: DailySummary[] = await Promise.all(
      weekDates.map((date) => getDailySummary(db, date, userId)),
    );

    const todaySummary = week[week.length - 1];

    // Calculate streak: consecutive days ending today with at least 1 food entry
    let streak = 0;
    const checkDate = new Date();
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const entryCount = await db.queryOne<EntryCountRow>(
        `SELECT COUNT(*) AS count FROM food_log_entries WHERE user_id = ? AND date = ?`,
        [userId, dateStr],
      );

      if ((entryCount?.count ?? 0) > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    const summary: WeeklySummary = {
      today: todaySummary,
      week,
      streak,
      goals,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('GET /api/dashboard/summary error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard summary' }, { status: 500 });
  }
}
