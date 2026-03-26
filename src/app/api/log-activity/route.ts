import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ActivityEntry } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const {
      user_id = 1,
      date,
      raw_input,
      activity_name,
      duration_minutes,
      calories_burned,
      met_value,
    } = body;

    if (!date || !activity_name || duration_minutes === undefined || calories_burned === undefined) {
      return NextResponse.json(
        { error: 'date, activity_name, duration_minutes, and calories_burned are required' },
        { status: 400 },
      );
    }

    const entry = await db.queryOne<ActivityEntry>(
      `INSERT INTO activity_log (user_id, date, raw_input, activity_name, duration_minutes, calories_burned, met_value, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ai')
       RETURNING *`,
      [user_id, date, raw_input ?? null, activity_name, duration_minutes, calories_burned, met_value ?? null],
    );

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error('POST /api/log-activity error:', error);
    return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== 'number') {
      return NextResponse.json({ error: 'id is required and must be a number' }, { status: 400 });
    }

    const result = await db.run('DELETE FROM activity_log WHERE id = ?', [id]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Activity entry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted_id: id });
  } catch (error) {
    console.error('DELETE /api/log-activity error:', error);
    return NextResponse.json({ error: 'Failed to delete activity entry' }, { status: 500 });
  }
}
