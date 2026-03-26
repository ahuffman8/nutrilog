import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { FoodItem, FoodLogEntry } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { user_id = 1, date, meal_type, raw_input, items } = body;

    if (!date || !meal_type || !raw_input || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'date, meal_type, raw_input, and items are required' },
        { status: 400 },
      );
    }

    // Insert the food log entry and get it back
    const entry = await db.queryOne<Omit<FoodLogEntry, 'items'>>(
      `INSERT INTO food_log_entries (user_id, date, meal_type, raw_input)
       VALUES (?, ?, ?, ?)
       RETURNING *`,
      [user_id, date, meal_type, raw_input],
    );

    if (!entry) {
      throw new Error('Failed to create food log entry');
    }

    const entryId = entry.id;

    // Insert all food items
    const foodItems: FoodItem[] = [];
    for (const item of items as FoodItem[]) {
      const inserted = await db.queryOne<FoodItem>(
        `INSERT INTO food_items (entry_id, name, quantity, unit, calories, protein_g, carbs_g, fat_g, sugar_g, fiber_g)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING *`,
        [entryId, item.name, item.quantity, item.unit, item.calories, item.protein_g, item.carbs_g, item.fat_g, item.sugar_g, item.fiber_g],
      );
      if (inserted) foodItems.push(inserted);
    }

    const createdEntry: FoodLogEntry = { ...entry, items: foodItems };

    return NextResponse.json({ entry: createdEntry }, { status: 201 });
  } catch (error) {
    console.error('POST /api/log-entry error:', error);
    return NextResponse.json({ error: 'Failed to create log entry' }, { status: 500 });
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

    // Delete food items first (foreign key constraint)
    await db.run('DELETE FROM food_items WHERE entry_id = ?', [id]);

    // Delete the food log entry
    const result = await db.run('DELETE FROM food_log_entries WHERE id = ?', [id]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted_id: id });
  } catch (error) {
    console.error('DELETE /api/log-entry error:', error);
    return NextResponse.json({ error: 'Failed to delete log entry' }, { status: 500 });
  }
}
