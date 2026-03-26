import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a nutrition and fitness coach. Analyze the user's 7-day food and activity log data and provide a 2-3 sentence personalized recommendation. Be specific, actionable, and encouraging. Return ONLY the recommendation text, no JSON, no preamble.`;

interface FoodDayRow {
  date: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sugar_g: number;
  fiber_g: number;
}

interface ActivityDayRow {
  date: string;
  total_calories_burned: number;
  total_duration_minutes: number;
  activities: string;
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { user_id = 1 } = body;

    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const startDate = weekDates[0];
    const endDate = weekDates[6];

    const foodData = await db.query<FoodDayRow>(`
      SELECT
        fle.date,
        COALESCE(SUM(fi.calories), 0) AS calories,
        COALESCE(SUM(fi.protein_g), 0) AS protein_g,
        COALESCE(SUM(fi.carbs_g), 0) AS carbs_g,
        COALESCE(SUM(fi.fat_g), 0) AS fat_g,
        COALESCE(SUM(fi.sugar_g), 0) AS sugar_g,
        COALESCE(SUM(fi.fiber_g), 0) AS fiber_g
      FROM food_log_entries fle
      LEFT JOIN food_items fi ON fi.entry_id = fle.id
      WHERE fle.user_id = ? AND fle.date BETWEEN ? AND ?
      GROUP BY fle.date
      ORDER BY fle.date ASC
    `, [user_id, startDate, endDate]);

    // Use dialect-appropriate string aggregation
    const aggFn = db.dialect === 'postgres'
      ? `STRING_AGG(activity_name, ', ')`
      : `GROUP_CONCAT(activity_name, ', ')`;

    const activityData = await db.query<ActivityDayRow>(`
      SELECT
        date,
        COALESCE(SUM(calories_burned), 0) AS total_calories_burned,
        COALESCE(SUM(duration_minutes), 0) AS total_duration_minutes,
        ${aggFn} AS activities
      FROM activity_log
      WHERE user_id = ? AND date BETWEEN ? AND ?
      GROUP BY date
      ORDER BY date ASC
    `, [user_id, startDate, endDate]);

    const combinedData = weekDates.map((date) => {
      const food = foodData.find((f) => f.date === date) ?? {
        date, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, sugar_g: 0, fiber_g: 0,
      };
      const activity = activityData.find((a) => a.date === date) ?? {
        date, total_calories_burned: 0, total_duration_minutes: 0, activities: '',
      };

      return {
        date,
        food: {
          calories: food.calories,
          protein_g: food.protein_g,
          carbs_g: food.carbs_g,
          fat_g: food.fat_g,
          sugar_g: food.sugar_g,
          fiber_g: food.fiber_g,
        },
        activity: {
          calories_burned: activity.total_calories_burned,
          duration_minutes: activity.total_duration_minutes,
          activities: activity.activities || 'none',
        },
        net_calories: food.calories - activity.total_calories_burned,
      };
    });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify(combinedData) }],
    });

    const insight = message.content[0].type === 'text' ? message.content[0].text : '';

    return NextResponse.json({
      insight,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('POST /api/dashboard/insight error:', error);
    return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 });
  }
}
