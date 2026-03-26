import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { FoodItem, FoodLogEntry, ActivityEntry, DailyGoals } from '@/types';

interface RawEntry {
  id: number;
  user_id: number;
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  raw_input: string;
  confirmed_at: string;
}

interface DailyTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sugar_g: number;
  fiber_g: number;
  calories_burned: number;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  try {
    const db = getDb();
    const { date } = await params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
    }

    const rawEntries = await db.query<RawEntry>(
      `SELECT * FROM food_log_entries WHERE user_id = 1 AND date = ? ORDER BY confirmed_at ASC`,
      [date],
    );

    const entryIds = rawEntries.map((e) => e.id);

    let allItems: FoodItem[] = [];
    if (entryIds.length > 0) {
      const placeholders = entryIds.map(() => '?').join(', ');
      allItems = await db.query<FoodItem>(
        `SELECT * FROM food_items WHERE entry_id IN (${placeholders})`,
        entryIds,
      );
    }

    // Group items by entry
    const itemsByEntry = new Map<number, FoodItem[]>();
    for (const item of allItems) {
      const existing = itemsByEntry.get(item.entry_id!) ?? [];
      existing.push(item);
      itemsByEntry.set(item.entry_id!, existing);
    }

    const entries: FoodLogEntry[] = rawEntries.map((entry) => ({
      ...entry,
      items: itemsByEntry.get(entry.id) ?? [],
    }));

    const burnedRow = await db.queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(calories_burned), 0) AS total FROM activity_log WHERE user_id = 1 AND date = ?`,
      [date],
    );

    const totals: DailyTotals = {
      ...allItems.reduce(
        (acc, item) => ({
          calories: acc.calories + item.calories,
          protein_g: acc.protein_g + item.protein_g,
          carbs_g: acc.carbs_g + item.carbs_g,
          fat_g: acc.fat_g + item.fat_g,
          sugar_g: acc.sugar_g + item.sugar_g,
          fiber_g: acc.fiber_g + item.fiber_g,
        }),
        { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, sugar_g: 0, fiber_g: 0 },
      ),
      calories_burned: burnedRow?.total ?? 0,
    };

    const activities = await db.query<ActivityEntry>(
      `SELECT * FROM activity_log WHERE user_id = 1 AND date = ? ORDER BY created_at ASC`,
      [date],
    );

    const goals = await db.queryOne<DailyGoals>('SELECT * FROM daily_goals WHERE user_id = 1');

    return NextResponse.json({ entries, totals, activities, goals });
  } catch (error) {
    console.error('GET /api/log/[date] error:', error);
    return NextResponse.json({ error: 'Failed to fetch log entries' }, { status: 500 });
  }
}
