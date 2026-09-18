import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { checkAiRateLimit } from '@/lib/aiRateLimit';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

// UI chrome is translated via the static dictionary (lib/i18n) — that only
// works for a fixed, known set of strings. The assistant's replies are
// generated fresh every turn, so there's no dictionary that could cover
// them; instead we tell Gemini which language to answer in.
const LANGUAGE_NAMES: Record<string, string> = { en: 'English', hi: 'Hindi', te: 'Telugu' };

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

  const { messages, sessionId, language } = (await request.json()) as {
    messages?: ChatMessage[];
    sessionId?: string;
    language?: string;
  };
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

  const languageName = LANGUAGE_NAMES[language ?? 'en'] ?? 'English';
  const systemInstruction = {
    parts: [
      {
        text: `You are the AI assistant inside School Buddy, an educational app for schools. Always reply in ${languageName}, regardless of what language the user writes in, unless they explicitly ask you to switch languages. Keep replies clear and appropriate for a school context. This is a chat bubble, not a document — write in short plain paragraphs or a simple dash list; avoid heavy markdown like headings (#), horizontal rules (---), or deeply nested formatting. Light use of **bold** for a key term is fine.`,
      },
    ],
  };

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, systemInstruction }),
    }
  );

  const data = await geminiResponse.json();
  if (!geminiResponse.ok) {
    return NextResponse.json({ error: data.error?.message || 'Gemini request failed.' }, { status: 502 });
  }

  const reply: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sorry, I couldn't generate a response.";

  // Persist this turn — the client still resends the full history to
  // Gemini each call (unchanged above), but only the newest user message
  // plus this reply need writing, since every earlier turn was already
  // saved on a prior call. Best-effort: a persistence failure shouldn't
  // fail a reply the user already has.
  let resolvedSessionId = sessionId;
  const admin = createAdminClient();
  if (admin) {
    try {
      if (!resolvedSessionId) {
        const firstUserText = messages.find((m) => m.role === 'user')?.text ?? 'New chat';
        const title = firstUserText.length > 40 ? `${firstUserText.slice(0, 40)}…` : firstUserText;
        const { data: session } = await admin.from('ai_chat_sessions').insert({ user_id: user.id, title }).select('id').single();
        resolvedSessionId = session?.id;
      } else {
        await admin.from('ai_chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', resolvedSessionId).eq('user_id', user.id);
      }

      if (resolvedSessionId) {
        const newestUserMessage = messages[messages.length - 1];
        await admin.from('ai_chat_messages').insert([
          { session_id: resolvedSessionId, user_id: user.id, role: 'user', text: newestUserMessage.text },
          { session_id: resolvedSessionId, user_id: user.id, role: 'assistant', text: reply },
        ]);
      }
    } catch {
      // Swallow — the chat reply itself already succeeded.
    }
  }

  return NextResponse.json({ reply, sessionId: resolvedSessionId });
}
