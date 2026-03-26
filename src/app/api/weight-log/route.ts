import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface WeightLogEntry {
  id: number;
  user_id: number;
  date: string;
  weight_lbs: number;
  created_at: string;
}

// GET: returns last 60 days of weight_log entries for user 1, ordered by date ASC
export async function GET() {
  try {
    const db = getDb();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const entries = await db.query<WeightLogEntry>(
      `SELECT * FROM weight_log WHERE user_id = 1 AND date >= ? ORDER BY date ASC`,
      [cutoffStr],
    );

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('GET /api/weight-log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST body: { date: string, weight_lbs: number }
// Upsert: if entry exists for that date, update it; otherwise insert
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, weight_lbs } = body as { date: string; weight_lbs: number };

    if (!date || weight_lbs == null) {
      return NextResponse.json({ error: 'date and weight_lbs are required' }, { status: 400 });
    }

    const db = getDb();

    const existing = await db.queryOne<WeightLogEntry>(
      `SELECT * FROM weight_log WHERE user_id = 1 AND date = ?`,
      [date],
    );

    let entry: WeightLogEntry;

    if (existing) {
      await db.run(`UPDATE weight_log SET weight_lbs = ? WHERE id = ?`, [weight_lbs, existing.id]);
      entry = (await db.queryOne<WeightLogEntry>(`SELECT * FROM weight_log WHERE id = ?`, [existing.id]))!;
    } else {
      entry = (await db.queryOne<WeightLogEntry>(
        `INSERT INTO weight_log (user_id, date, weight_lbs) VALUES (1, ?, ?) RETURNING *`,
        [date, weight_lbs],
      ))!;
    }

    return NextResponse.json({ entry });
  } catch (error) {
    console.error('POST /api/weight-log error:', error);
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
    await db.run(`DELETE FROM weight_log WHERE id = ? AND user_id = 1`, [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/weight-log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
