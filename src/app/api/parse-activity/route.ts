import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a fitness expert and calorie calculation assistant. When given an activity description and user weight, calculate the calories burned. Return ONLY a JSON object with no markdown, preamble, or explanation. The JSON must have these exact fields: activity_name (string), duration_minutes (number), estimated_calories_burned (number, calculated using MET formula: MET × weight_kg × duration_hours), met_value (number, the MET value used). Common MET values: walking 3.5, running 8-12, cycling 6-10, weightlifting 3-6, swimming 6-8, yoga 2.5-4, HIIT 8-12.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, user_weight_kg } = body;

    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'input is required and must be a string' }, { status: 400 });
    }

    if (user_weight_kg === undefined || typeof user_weight_kg !== 'number') {
      return NextResponse.json({ error: 'user_weight_kg is required and must be a number' }, { status: 400 });
    }

    const userMessage = `Activity description: ${input}\nUser weight: ${user_weight_kg} kg`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const parsed = JSON.parse(text);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('POST /api/parse-activity error:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Failed to parse Claude response as JSON' }, { status: 502 });
    }
    return NextResponse.json({ error: 'Failed to parse activity input' }, { status: 500 });
  }
}
