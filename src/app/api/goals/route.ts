import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { DailyGoals } from '@/types';

export async function GET() {
  try {
    const db = getDb();
    const goals = await db.queryOne<DailyGoals>('SELECT * FROM daily_goals WHERE user_id = 1');

    if (!goals) {
      return NextResponse.json({ goals: null }, { status: 404 });
    }

    return NextResponse.json({ goals });
  } catch (error) {
    console.error('GET /api/goals error:', error);
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { calories, protein_g, carbs_g, fat_g } = body;

    const existing = await db.queryOne<DailyGoals>('SELECT * FROM daily_goals WHERE user_id = 1');

    if (existing) {
      await db.run(
        `UPDATE daily_goals SET
           calories = ?,
           protein_g = ?,
           carbs_g = ?,
           fat_g = ?
         WHERE user_id = 1`,
        [
          calories ?? existing.calories,
          protein_g ?? existing.protein_g,
          carbs_g ?? existing.carbs_g,
          fat_g ?? existing.fat_g,
        ],
      );
    } else {
      await db.run(
        `INSERT INTO daily_goals (user_id, calories, protein_g, carbs_g, fat_g)
         VALUES (1, ?, ?, ?, ?)`,
        [calories, protein_g, carbs_g, fat_g],
      );
    }

    const updatedGoals = await db.queryOne<DailyGoals>('SELECT * FROM daily_goals WHERE user_id = 1');

    return NextResponse.json({ goals: updatedGoals });
  } catch (error) {
    console.error('PUT /api/goals error:', error);
    return NextResponse.json({ error: 'Failed to update goals' }, { status: 500 });
  }
}
