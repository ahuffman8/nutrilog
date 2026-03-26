import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { calculateDailyGoals } from '@/lib/calculations';
import { User, DailyGoals } from '@/types';

export async function GET() {
  try {
    const db = getDb();
    const user = await db.queryOne<User>('SELECT * FROM users LIMIT 1');

    if (!user) {
      return NextResponse.json({ user: null }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('GET /api/profile error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();

    const {
      name,
      age,
      sex,
      height_cm,
      weight_kg,
      goal_weight_kg,
      activity_level,
      primary_goal,
    } = body;

    const existingUser = await db.queryOne<User>('SELECT * FROM users LIMIT 1');

    let updatedUser: User;

    if (existingUser) {
      await db.run(
        `UPDATE users SET
           name = ?,
           age = ?,
           sex = ?,
           height_cm = ?,
           weight_kg = ?,
           goal_weight_kg = ?,
           activity_level = ?,
           primary_goal = ?
         WHERE id = ?`,
        [
          name ?? existingUser.name,
          age ?? existingUser.age,
          sex ?? existingUser.sex,
          height_cm ?? existingUser.height_cm,
          weight_kg ?? existingUser.weight_kg,
          goal_weight_kg ?? existingUser.goal_weight_kg,
          activity_level ?? existingUser.activity_level,
          primary_goal ?? existingUser.primary_goal,
          existingUser.id,
        ],
      );
      updatedUser = (await db.queryOne<User>('SELECT * FROM users WHERE id = ?', [existingUser.id]))!;
    } else {
      updatedUser = (await db.queryOne<User>(
        `INSERT INTO users (name, age, sex, height_cm, weight_kg, goal_weight_kg, activity_level, primary_goal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING *`,
        [name, age, sex, height_cm, weight_kg, goal_weight_kg ?? null, activity_level, primary_goal],
      ))!;
    }

    // Recalculate daily goals
    const goals = calculateDailyGoals(updatedUser);
    const existingGoals = await db.queryOne<DailyGoals>(
      'SELECT * FROM daily_goals WHERE user_id = ?',
      [updatedUser.id],
    );

    if (existingGoals) {
      await db.run(
        `UPDATE daily_goals SET
           calories = ?,
           protein_g = ?,
           carbs_g = ?,
           fat_g = ?
         WHERE user_id = ?`,
        [goals.calories, goals.protein_g, goals.carbs_g, goals.fat_g, updatedUser.id],
      );
    } else {
      await db.run(
        `INSERT INTO daily_goals (user_id, calories, protein_g, carbs_g, fat_g)
         VALUES (?, ?, ?, ?, ?)`,
        [updatedUser.id, goals.calories, goals.protein_g, goals.carbs_g, goals.fat_g],
      );
    }

    const updatedGoals = await db.queryOne<DailyGoals>(
      'SELECT * FROM daily_goals WHERE user_id = ?',
      [updatedUser.id],
    );

    return NextResponse.json({ user: updatedUser, goals: updatedGoals });
  } catch (error) {
    console.error('PUT /api/profile error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
