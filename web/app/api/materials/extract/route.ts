import { NextResponse } from 'next/server';
import { checkAiRateLimit } from '@/lib/aiRateLimit';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const EXTRACTION_PROMPT_SINGLE =
  'This is a piece of class material (lecture notes, a textbook excerpt, or similar). ' +
  'Extract its educational text content as clean, well-formatted plain text, and write a 2-3 sentence summary. ' +
  'Respond with only a JSON object: {"extracted_text": string, "summary": string}.';

const EXTRACTION_PROMPT_MULTI =
  'These images are sequential pages of one piece of class material (lecture notes, a textbook excerpt, or similar), in order. ' +
  'Extract their combined educational text content as one clean, well-formatted plain text document (not per-page, one continuous document), ' +
  'and write a 2-3 sentence summary of the whole thing. ' +
  'Respond with only a JSON object: {"extracted_text": string, "summary": string}.';

export async function POST(request: Request) {
  const { materialId } = (await request.json()) as { materialId?: string };
  if (!materialId) return NextResponse.json({ error: 'materialId is required.' }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const rate = await checkAiRateLimit(user.id, 'materials-extract');
  if (!rate.ok) {
    return NextResponse.json({ error: 'Too many extraction requests — wait a bit and try again.' }, { status: 429 });
  }

  // The cookie-based client respects RLS ("Teachers manage materials for own
  // classes"), so this select alone confirms the caller owns the material —
  // no separate ownership check needed.
  const { data: material } = await supabase.from('materials').select('*').eq('id', materialId).single();
  if (!material) return NextResponse.json({ error: 'Material not found.' }, { status: 404 });

  const { data: files } = await supabase
    .from('material_files')
    .select('file_path, mime_type')
    .eq('material_id', materialId)
    .order('position');
  if (!files || files.length === 0) return NextResponse.json({ error: 'No files found for this material.' }, { status: 404 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });

  if (!geminiApiKey) {
    await admin.from('materials').update({ status: 'failed', error_message: 'GEMINI_API_KEY is not set.' }).eq('id', materialId);
    return NextResponse.json({ error: 'AI extraction is not configured yet — ask an admin to set GEMINI_API_KEY.' }, { status: 500 });
  }

  const inlineParts: { inline_data: { mime_type: string; data: string } }[] = [];
  for (const file of files) {
    const { data: fileBlob, error: downloadError } = await admin.storage.from('materials').download(file.file_path);
    if (downloadError || !fileBlob) {
      const message = downloadError?.message || 'Could not read one of the uploaded files.';
      await admin.from('materials').update({ status: 'failed', error_message: message }).eq('id', materialId);
      return NextResponse.json({ error: message }, { status: 500 });
    }
    const base64 = Buffer.from(await fileBlob.arrayBuffer()).toString('base64');
    inlineParts.push({ inline_data: { mime_type: file.mime_type, data: base64 } });
  }

  const promptText = inlineParts.length > 1 ? EXTRACTION_PROMPT_MULTI : EXTRACTION_PROMPT_SINGLE;

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [...inlineParts, { text: promptText }],
            },
          ],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );

    const data = await geminiResponse.json();
    if (!geminiResponse.ok) throw new Error(data.error?.message || 'Gemini request failed.');

    const raw: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const parsed = JSON.parse(raw) as { extracted_text?: string; summary?: string };
    if (!parsed.extracted_text) throw new Error('Gemini did not return extracted text.');

    const { data: updated, error: updateError } = await admin
      .from('materials')
      .update({ status: 'extracted', extracted_text: parsed.extracted_text, summary: parsed.summary ?? null, error_message: null })
      .eq('id', materialId)
      .select('*')
      .single();
    if (updateError || !updated) throw new Error(updateError?.message || 'Could not save extracted content.');

    return NextResponse.json(updated);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Extraction failed.';
    const { data: updated } = await admin
      .from('materials')
      .update({ status: 'failed', error_message: message })
      .eq('id', materialId)
      .select('*')
      .single();
    return NextResponse.json(updated ?? { error: message }, { status: 502 });
  }
}
