import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a nutritionist and food analysis assistant. When given a natural language description of food eaten, parse it into structured nutritional data.

Return ONLY valid JSON with no markdown, no code blocks, no preamble, and no explanation. The response must be parseable by JSON.parse().

The JSON must follow this exact schema:
{
  "foods": [
    {
      "name": "string (food name)",
      "quantity": number,
      "unit": "string (e.g. grams, oz, cup, piece, slice)",
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "sugar_g": number,
      "fiber_g": number
    }
  ],
  "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
  "confidence": number (0 to 1, your confidence in the nutritional estimates)
}

Use standard nutritional databases for calorie and macro estimates. Infer meal_type from context (time references, food types). Default to "snack" if unclear.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input } = body;

    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'input is required and must be a string' }, { status: 400 });
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: input }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const parsed = JSON.parse(text);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('POST /api/parse-food error:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Failed to parse Claude response as JSON' }, { status: 502 });
    }
    return NextResponse.json({ error: 'Failed to parse food input' }, { status: 500 });
  }
}
