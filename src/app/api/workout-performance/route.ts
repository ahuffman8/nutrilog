import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface WorkoutPerformance {
  id: number;
  user_id: number;
  date: string;
  exercise_name: string;
  exercise_type: 'run' | 'lift' | 'cardio';
  distance_miles: number | null;
  time_seconds: number | null;
  weight_lbs: number | null;
  reps: number | null;
  sets: number | null;
  notes: string | null;
  created_at: string;
}

interface PR {
  weight_lbs?: number;
  time_seconds?: number;
  date: string;
}

// GET: query param ?exercise_name=Bench+Press (optional)
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const exerciseName = searchParams.get('exercise_name');

    let entries: WorkoutPerformance[];
    const prs: Record<string, PR> = {};

    if (exerciseName) {
      entries = await db.query<WorkoutPerformance>(
        `SELECT * FROM workout_performances WHERE user_id = 1 AND exercise_name = ? ORDER BY date DESC LIMIT 50`,
        [exerciseName],
      );
      buildPrs(entries, prs);
    } else {
      const allEntries = await db.query<WorkoutPerformance>(
        `SELECT * FROM workout_performances WHERE user_id = 1 ORDER BY created_at DESC LIMIT 100`,
      );

      // Group by exercise_name, take last 10 per exercise
      const grouped: Record<string, WorkoutPerformance[]> = {};
      for (const entry of allEntries) {
        if (!grouped[entry.exercise_name]) grouped[entry.exercise_name] = [];
        if (grouped[entry.exercise_name].length < 10) {
          grouped[entry.exercise_name].push(entry);
        }
      }
      entries = Object.values(grouped).flat();

      const allForPrs = await db.query<WorkoutPerformance>(
        `SELECT * FROM workout_performances WHERE user_id = 1 ORDER BY date ASC`,
      );
      buildPrs(allForPrs, prs);
    }

    return NextResponse.json({ entries, prs });
  } catch (error) {
    console.error('GET /api/workout-performance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function buildPrs(entries: WorkoutPerformance[], prs: Record<string, PR>): void {
  for (const entry of entries) {
    const name = entry.exercise_name;
    if (entry.exercise_type === 'lift' && entry.weight_lbs != null) {
      if (!prs[name] || entry.weight_lbs > (prs[name].weight_lbs ?? -Infinity)) {
        prs[name] = { weight_lbs: entry.weight_lbs, date: entry.date };
      }
    } else if (entry.exercise_type === 'run' && entry.time_seconds != null) {
      if (!prs[name] || entry.time_seconds < (prs[name].time_seconds ?? Infinity)) {
        prs[name] = { time_seconds: entry.time_seconds, date: entry.date };
      }
    }
  }
}

// POST body: { date, exercise_name, exercise_type, distance_miles?, time_seconds?, weight_lbs?, reps?, sets?, notes? }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      date,
      exercise_name,
      exercise_type,
      distance_miles,
      time_seconds,
      weight_lbs,
      reps,
      sets,
      notes,
    } = body as {
      date: string;
      exercise_name: string;
      exercise_type: 'run' | 'lift' | 'cardio';
      distance_miles?: number;
      time_seconds?: number;
      weight_lbs?: number;
      reps?: number;
      sets?: number;
      notes?: string;
    };

    if (!date || !exercise_name || !exercise_type) {
      return NextResponse.json(
        { error: 'date, exercise_name, and exercise_type are required' },
        { status: 400 },
      );
    }

    const db = getDb();

    const entry = (await db.queryOne<WorkoutPerformance>(
      `INSERT INTO workout_performances
         (user_id, date, exercise_name, exercise_type, distance_miles, time_seconds, weight_lbs, reps, sets, notes)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`,
      [
        date,
        exercise_name,
        exercise_type,
        distance_miles ?? null,
        time_seconds ?? null,
        weight_lbs ?? null,
        reps ?? null,
        sets ?? null,
        notes ?? null,
      ],
    ))!;

    // Check if this is a PR
    let is_pr = false;

    if (exercise_type === 'lift' && weight_lbs != null) {
      const best = await db.queryOne<{ max_weight: number | null }>(
        `SELECT MAX(weight_lbs) as max_weight FROM workout_performances WHERE user_id = 1 AND exercise_name = ? AND id != ?`,
        [exercise_name, entry.id],
      );
      is_pr = best?.max_weight == null || weight_lbs > best.max_weight;
    } else if (exercise_type === 'run' && time_seconds != null) {
      const best = await db.queryOne<{ min_time: number | null }>(
        `SELECT MIN(time_seconds) as min_time FROM workout_performances WHERE user_id = 1 AND exercise_name = ? AND id != ?`,
        [exercise_name, entry.id],
      );
      is_pr = best?.min_time == null || time_seconds < best.min_time;
    }

    return NextResponse.json({ entry, is_pr });
  } catch (error) {
    console.error('POST /api/workout-performance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE body: { id: number }
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body as { id: number };

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const db = getDb();
    await db.run(`DELETE FROM workout_performances WHERE id = ? AND user_id = 1`, [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/workout-performance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
