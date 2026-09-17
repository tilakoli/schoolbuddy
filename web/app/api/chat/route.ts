import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { checkAiRateLimit } from '@/lib/aiRateLimit';
import { createClient } from '@/lib/supabase/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

// Web calls this route same-origin, so its own session cookie is enough.
// The mobile app has no access to that cookie, so it instead sends its own
// Supabase access token in an Authorization header — validated the same way.
async function getAuthedUser(request: Request) {
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (bearer) {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);
    const { data } = await supabase.auth.getUser(bearer);
    return data.user;
  }

  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function POST(request: Request) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const rate = await checkAiRateLimit(user.id, 'chat');
  if (!rate.ok) {
    return NextResponse.json(
      { error: `You're sending messages too quickly — wait a few minutes and try again.` },
      { status: 429 }
    );
  }

  if (!geminiApiKey) {
    return NextResponse.json({ error: 'AI chat is not configured yet — ask an admin to set GEMINI_API_KEY.' }, { status: 500 });
  }

  const { messages } = (await request.json()) as { messages?: ChatMessage[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages is required.' }, { status: 400 });
  }
  // Every turn resends the full history, so cost grows with conversation
  // length — cap it so one long-running chat can't balloon unbounded.
  if (messages.length > 60) {
    return NextResponse.json({ error: 'This conversation has gotten long — start a new chat.' }, { status: 400 });
  }

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }));

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    }
  );

  const data = await geminiResponse.json();
  if (!geminiResponse.ok) {
    return NextResponse.json({ error: data.error?.message || 'Gemini request failed.' }, { status: 502 });
  }

  const reply: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sorry, I couldn't generate a response.";
  return NextResponse.json({ reply });
}
