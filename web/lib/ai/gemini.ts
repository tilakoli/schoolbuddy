// Server-side JSON generation. The key stays in a header, never in URLs/logs.
type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };
export async function generateJson(system: string, contents: { role: string; parts: GeminiPart[] }[], schema: object) {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  if (!key || !model || !/^[a-zA-Z0-9._-]+$/.test(model)) throw new Error('AI configuration is unavailable.');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] }, contents,
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema, maxOutputTokens: 6000 },
    }),
  });
  if (!response.ok) throw new Error(`AI provider returned ${response.status}.`);
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.filter((part: { thought?: boolean }) => !part.thought)
    .map((part: { text?: string }) => part.text ?? '').join('');
  if (!text) throw new Error('AI returned no answer.');
  return JSON.parse(text) as unknown;
}
