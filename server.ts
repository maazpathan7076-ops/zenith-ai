import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '40mb' }));

// Helper to resolve Gemini model name
function resolveModelName(modelId?: string): string {
  if (!modelId) return 'gemini-3.8-flash';
  const trimmed = modelId.trim().replace(/^models\//, '');
  if (
    trimmed === 'gemini-3.8-flash' ||
    trimmed.includes('2.5') ||
    trimmed.includes('3.5') ||
    trimmed.includes('flash') ||
    trimmed.includes('lite')
  ) {
    return 'gemini-3.8-flash';
  }
  if (trimmed === 'gemini-3.1-pro-preview') {
    return 'gemini-3.1-pro-preview';
  }
  return 'gemini-3.8-flash';
}

// Helper to resolve API Key
function resolveApiKey(customKey?: string): string {
  const trimmed = (customKey || '').trim();
  if (trimmed && !trimmed.includes('MY_GEMINI_API_KEY')) {
    return trimmed;
  }
  const envKey = (process.env.GEMINI_API_KEY || '').trim();
  if (envKey && !envKey.includes('MY_GEMINI_API_KEY')) {
    return envKey;
  }
  return '';
}

// Helper to format clean error message
function formatApiError(err: any): string {
  const raw = err?.message || (typeof err === 'string' ? err : 'Error communicating with Gemini AI API');
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.error?.message) {
        return parsed.error.message;
      }
    }
  } catch {}
  return raw;
}

interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
  source?: string;
  date?: string;
}

function cleanHtml(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function searchGoogleNews(query: string, recencyDays?: number): Promise<WebSearchResult[]> {
  try {
    let cleanQuery = query
      .replace(/what are the|can you tell me|tell me about|please search for|find|show me/gi, '')
      .replace(/from the last \d+ days?/gi, '')
      .replace(/in the past \d+ days?/gi, '')
      .replace(/last \d+ days?/gi, '')
      .replace(/this past week/gi, '')
      .replace(/[^\w\s-]/g, ' ')
      .trim();

    if (!cleanQuery) cleanQuery = query;

    const whenParam = recencyDays ? ` when:${recencyDays}d` : '';
    const fullQuery = `${cleanQuery}${whenParam}`.trim();
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(fullQuery)}&hl=en-US&gl=US&ceid=US:en`;

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return [];
    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    const results: WebSearchResult[] = [];

    for (const match of items.slice(0, 10)) {
      const itemXml = match[1];
      let title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
      const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';
      const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '';
      const source = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || '';

      title = cleanHtml(title);
      if (source && title.endsWith(` - ${source}`)) {
        title = title.slice(0, -(` - ${source}`.length)).trim();
      }

      if (title && link) {
        results.push({
          title,
          url: link,
          source: source || 'Google News',
          date: pubDate,
          snippet: `Published by ${source || 'News Source'} on ${pubDate}. Headline: ${title}`,
        });
      }
    }
    return results;
  } catch {
    return [];
  }
}

async function searchDuckDuckGoHtml(query: string): Promise<WebSearchResult[]> {
  try {
    const cleanQuery = query.trim().replace(/^["']|["']$/g, '');
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];
    const html = await res.text();
    const linkMatches = [
      ...html.matchAll(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g),
    ];
    const snippetMatches = [
      ...html.matchAll(
        /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
      ),
    ];

    const results: WebSearchResult[] = [];
    for (let i = 0; i < Math.min(linkMatches.length, 8); i++) {
      const rawHref = linkMatches[i][1];
      let cleanUrl = rawHref;
      const uddgMatch = rawHref.match(/uddg=([^&]+)/);
      if (uddgMatch) {
        cleanUrl = decodeURIComponent(uddgMatch[1]);
      }
      const title = cleanHtml(linkMatches[i][2]);
      const snippet = snippetMatches[i] ? cleanHtml(snippetMatches[i][2]) : '';

      if (cleanUrl && title && !cleanUrl.includes('duckduckgo.com/')) {
        let domain = '';
        try {
          domain = new URL(cleanUrl).hostname.replace(/^www\./, '');
        } catch {}
        results.push({
          title,
          snippet,
          url: cleanUrl,
          source: domain || 'Web',
        });
      }
    }
    return results;
  } catch {
    return [];
  }
}

async function searchWikipedia(query: string): Promise<WebSearchResult[]> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&namespace=0&format=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ZenithAI/1.0' },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const titles = data[1] || [];
    const snippets = data[2] || [];
    const urls = data[3] || [];
    const results: WebSearchResult[] = [];
    for (let i = 0; i < titles.length; i++) {
      if (titles[i] && urls[i]) {
        results.push({
          title: titles[i],
          snippet: snippets[i] || '',
          url: urls[i],
          source: 'Wikipedia',
        });
      }
    }
    return results;
  } catch {
    return [];
  }
}

// Live web search retriever for Web Search mode
async function performLiveWebSearch(query: string, contextQuery?: string): Promise<WebSearchResult[]> {
  try {
    let effectiveQuery = query.trim().replace(/^["']|["']$/g, '');
    if (
      contextQuery &&
      effectiveQuery.length < 25 &&
      /what about|how about|tell me more|expand on|and for|what of/i.test(effectiveQuery)
    ) {
      effectiveQuery = `${effectiveQuery} ${contextQuery}`.trim();
    }

    const isNewsOrRecent =
      /news|latest|recent|today|yesterday|days|week|update|current|breaking|stories|headlines/i.test(
        effectiveQuery
      );
    const daysMatch =
      effectiveQuery.match(/last\s*(\d+)\s*days?/i) || effectiveQuery.match(/past\s*(\d+)\s*days?/i);
    const recencyDays = daysMatch ? parseInt(daysMatch[1], 10) : isNewsOrRecent ? 7 : undefined;

    // For news or recency queries, prioritize Google News RSS with live publication dates and sources
    if (isNewsOrRecent) {
      const [newsRes, ddgRes] = await Promise.allSettled([
        searchGoogleNews(effectiveQuery, recencyDays),
        searchDuckDuckGoHtml(effectiveQuery),
      ]);
      const results: WebSearchResult[] = [];
      const seen = new Set<string>();
      const newsList = newsRes.status === 'fulfilled' ? newsRes.value : [];
      const ddgList = ddgRes.status === 'fulfilled' ? ddgRes.value : [];

      for (const item of [...newsList, ...ddgList]) {
        if (!seen.has(item.url)) {
          seen.add(item.url);
          results.push(item);
        }
      }
      if (results.length > 0) return results.slice(0, 10);
    }

    // General web queries
    const [ddgRes, newsRes, wikiRes] = await Promise.allSettled([
      searchDuckDuckGoHtml(effectiveQuery),
      searchGoogleNews(effectiveQuery),
      searchWikipedia(effectiveQuery),
    ]);
    const results: WebSearchResult[] = [];
    const seen = new Set<string>();
    const ddgList = ddgRes.status === 'fulfilled' ? ddgRes.value : [];
    const newsList = newsRes.status === 'fulfilled' ? newsRes.value : [];
    const wikiList = wikiRes.status === 'fulfilled' ? wikiRes.value : [];

    for (const item of [...ddgList, ...newsList, ...wikiList]) {
      if (!seen.has(item.url)) {
        seen.add(item.url);
        results.push(item);
      }
    }
    return results.slice(0, 10);
  } catch (err) {
    console.error('Web search error:', err);
    return [];
  }
}

// POST /api/chat - Streaming generation endpoint using Server-Sent Events
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { modelId, systemInstruction, history, prompt, image, temperature, mode } = req.body;
    const customApiKey = req.headers['x-api-key'] as string | undefined;

    const apiKey = resolveApiKey(customApiKey);
    if (!apiKey) {
      res.status(401).json({
        error: 'Missing Gemini API Key. Please configure your key in the AI Studio Secrets panel.',
      });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const targetModel = resolveModelName(modelId);
    const isWebSearch = mode === 'web_search';

    // Build properly alternating conversation history
    const contents: Array<{
      role: 'user' | 'model';
      parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
    }> = [];

    // Filter valid history and enforce alternating roles
    const validHistory = Array.isArray(history)
      ? history.filter((m) => m && m.role && m.content && m.status !== 'error')
      : [];

    let expectedRole: 'user' | 'model' = 'user';
    for (const msg of validHistory.slice(-10)) {
      const role: 'user' | 'model' = msg.role === 'user' ? 'user' : 'model';
      if (role === expectedRole) {
        const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
          { text: msg.content },
        ];
        if (msg.imageUri && role === 'user') {
          const match = msg.imageUri.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            parts.push({
              inlineData: {
                mimeType: match[1],
                data: match[2],
              },
            });
          }
        }
        contents.push({ role, parts });
        expectedRole = expectedRole === 'user' ? 'model' : 'user';
      }
    }

    // Set SSE headers early
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // If Web Search mode is active, execute live web search and prepare grounding
    let searchResults: WebSearchResult[] = [];
    let effectiveSystemInstruction = systemInstruction || '';

    if (isWebSearch && prompt) {
      let contextQuery = '';
      if (validHistory.length > 0) {
        const lastUserMsg = [...validHistory].reverse().find((m) => m.role === 'user');
        if (lastUserMsg?.content) {
          contextQuery = lastUserMsg.content.slice(0, 120);
        }
      }

      searchResults = await performLiveWebSearch(prompt, contextQuery);
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      });

      if (searchResults.length > 0) {
        const searchContext = searchResults
          .map(
            (r, i) =>
              `[Source ${i + 1}]: "${r.title}"\nPublisher / Source: ${r.source || 'Web'}\nDate: ${r.date || 'Recent'}\nURL: ${r.url}\nSummary: ${r.snippet}`
          )
          .join('\n\n');

        effectiveSystemInstruction = [
          effectiveSystemInstruction,
          `CURRENT REAL-WORLD DATE: ${currentDate}.`,
          'You are Zenith AI in Web Search mode. You have executed a real-time live web search for the user query.',
          'Here are the verified live web search results from the web:',
          searchContext,
          'CRITICAL INSTRUCTIONS FOR WEB SEARCH MODE:',
          '1. Base your answer directly on the verified live search results above. Do NOT use outdated knowledge from 2024 when recent information is provided.',
          '2. Synthesize a comprehensive, well-structured answer with bullet points or sections highlighting the major stories and facts.',
          '3. Cite your sources inline using clickable Markdown links with the publisher name or article title, e.g. [Publisher Name](URL).',
          '4. Always include a dedicated "### Sources" section at the end listing all referenced source links as bullet points with their publisher names and URLs.',
          '5. Mention specific dates and recent timeframes to assure the user of accurate recency.',
        ].join('\n\n');
      } else {
        effectiveSystemInstruction = [
          effectiveSystemInstruction,
          `CURRENT REAL-WORLD DATE: ${currentDate}.`,
          'Web Search mode is active, but live web search returned no results for this query. Clearly inform the user that live search returned no current results, and distinguish general background knowledge from verified current facts.',
        ].join('\n\n');
      }
    }

    // Append current prompt turn
    const currentParts: Array<{
      text?: string;
      inlineData?: { mimeType: string; data: string };
    }> = [];
    if (prompt) {
      currentParts.push({ text: prompt });
    }
    if (image) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        currentParts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }
    contents.push({ role: 'user', parts: currentParts });

    // Config
    const modelCandidates = [targetModel, 'gemini-3.1-flash-lite'];
    let fullStreamedText = '';
    const collectedSources = new Map<string, string>();
    for (const r of searchResults) {
      const label = r.source ? `${r.title} (${r.source})` : r.title;
      collectedSources.set(r.url, label);
    }

    let streamSuccess = false;
    let lastStreamErr: any;

    for (const m of modelCandidates) {
      try {
        const responseStream = await ai.models.generateContentStream({
          model: m,
          contents,
          config: {
            systemInstruction: effectiveSystemInstruction || undefined,
            temperature: typeof temperature === 'number' ? temperature : 0.7,
          },
        });

        for await (const chunk of responseStream) {
          const text = chunk.text;
          if (text) {
            fullStreamedText += text;
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }
        streamSuccess = true;
        break;
      } catch (err: any) {
        lastStreamErr = err;
        console.warn(`Model ${m} stream attempt failed:`, err?.message || err);
        if (fullStreamedText.length > 0) {
          break;
        }
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    if (!streamSuccess && fullStreamedText.length === 0) {
      throw lastStreamErr || new Error('All available models are temporarily unavailable.');
    }

    // If Web Search mode is active and sources were not included in model output, append them
    if (
      isWebSearch &&
      collectedSources.size > 0 &&
      !fullStreamedText.includes('### Sources') &&
      !fullStreamedText.includes('## Sources')
    ) {
      let sourcesMarkdown = '\n\n### Sources\n';
      for (const [url, title] of collectedSources.entries()) {
        sourcesMarkdown += `- [${title}](${url})\n`;
      }
      res.write(`data: ${JSON.stringify({ text: sourcesMarkdown })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Streaming error in /api/chat:', error);
    const errorMessage = formatApiError(error);
    if (!res.headersSent) {
      res.status(500).json({ error: errorMessage });
    } else {
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
    }
  }
});

// POST /api/chat/generate - Non-streaming generation fallback
app.post('/api/chat/generate', async (req: Request, res: Response) => {
  try {
    const { modelId, systemInstruction, history, prompt, image, temperature, mode } = req.body;
    const customApiKey = req.headers['x-api-key'] as string | undefined;

    const apiKey = resolveApiKey(customApiKey);
    if (!apiKey) {
      res.status(401).json({
        error: 'Missing Gemini API Key. Please configure your key in the AI Studio Secrets panel.',
      });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const targetModel = resolveModelName(modelId);
    const isWebSearch = mode === 'web_search';

    const contents: any[] = [];
    const validHistory = Array.isArray(history)
      ? history.filter((m) => m && m.role && m.content && m.status !== 'error')
      : [];

    let expectedRole: 'user' | 'model' = 'user';
    for (const msg of validHistory.slice(-10)) {
      const role: 'user' | 'model' = msg.role === 'user' ? 'user' : 'model';
      if (role === expectedRole) {
        contents.push({ role, parts: [{ text: msg.content }] });
        expectedRole = expectedRole === 'user' ? 'model' : 'user';
      }
    }

    let searchResults: WebSearchResult[] = [];
    let effectiveSystemInstruction = systemInstruction || '';

    if (isWebSearch && prompt) {
      let contextQuery = '';
      if (validHistory.length > 0) {
        const lastUserMsg = [...validHistory].reverse().find((m) => m.role === 'user');
        if (lastUserMsg?.content) {
          contextQuery = lastUserMsg.content.slice(0, 120);
        }
      }

      searchResults = await performLiveWebSearch(prompt, contextQuery);
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      });

      if (searchResults.length > 0) {
        const searchContext = searchResults
          .map(
            (r, i) =>
              `[Source ${i + 1}]: "${r.title}"\nPublisher / Source: ${r.source || 'Web'}\nDate: ${r.date || 'Recent'}\nURL: ${r.url}\nSummary: ${r.snippet}`
          )
          .join('\n\n');

        effectiveSystemInstruction = [
          effectiveSystemInstruction,
          `CURRENT REAL-WORLD DATE: ${currentDate}.`,
          'You are Zenith AI in Web Search mode. You have executed a real-time live web search for the user query.',
          'Here are the verified live web search results from the web:',
          searchContext,
          'CRITICAL INSTRUCTIONS FOR WEB SEARCH MODE:',
          '1. Base your answer directly on the verified live search results above. Do NOT use outdated knowledge from 2024 when recent information is provided.',
          '2. Synthesize a comprehensive, well-structured answer with bullet points or sections highlighting the major stories and facts.',
          '3. Cite your sources inline using clickable Markdown links with the publisher name or article title, e.g. [Publisher Name](URL).',
          '4. Always include a dedicated "### Sources" section at the end listing all referenced source links as bullet points with their publisher names and URLs.',
          '5. Mention specific dates and recent timeframes to assure the user of accurate recency.',
        ].join('\n\n');
      } else {
        effectiveSystemInstruction = [
          effectiveSystemInstruction,
          `CURRENT REAL-WORLD DATE: ${currentDate}.`,
          'Web Search mode is active, but live web search returned no results for this query. Clearly inform the user that live search returned no current results, and distinguish general background knowledge from verified current facts.',
        ].join('\n\n');
      }
    }

    const currentParts: any[] = [{ text: prompt }];
    if (image) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        currentParts.push({
          inlineData: { mimeType: match[1], data: match[2] },
        });
      }
    }
    contents.push({ role: 'user', parts: currentParts });

    const baseConfig: any = {
      systemInstruction: effectiveSystemInstruction || undefined,
      temperature: typeof temperature === 'number' ? temperature : 0.7,
    };

    let result;
    try {
      result = await ai.models.generateContent({
        model: targetModel,
        contents,
        config: baseConfig,
      });
    } catch (genErr: any) {
      const msg = genErr?.message || '';
      const isTransient =
        genErr?.status === 503 ||
        genErr?.status === 429 ||
        msg.includes('503') ||
        msg.includes('429') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('Quota exceeded') ||
        msg.includes('RESOURCE_EXHAUSTED');

      if (isTransient) {
        const fallbackConfig: any = {
          systemInstruction: effectiveSystemInstruction || undefined,
          temperature: typeof temperature === 'number' ? temperature : 0.7,
        };
        try {
          await new Promise((r) => setTimeout(r, 1000));
          result = await ai.models.generateContent({
            model: targetModel,
            contents,
            config: fallbackConfig,
          });
        } catch {
          result = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents,
            config: fallbackConfig,
          });
        }
      } else {
        throw genErr;
      }
    }

    let finalAnswer = result.text || '';
    if (
      isWebSearch &&
      searchResults.length > 0 &&
      !finalAnswer.includes('### Sources') &&
      !finalAnswer.includes('## Sources')
    ) {
      let sourcesMarkdown = '\n\n### Sources\n';
      for (const r of searchResults) {
        const label = r.source ? `${r.title} (${r.source})` : r.title;
        sourcesMarkdown += `- [${label}](${r.url})\n`;
      }
      finalAnswer += sourcesMarkdown;
    }

    res.json({ text: finalAnswer });
  } catch (error: any) {
    console.error('Error in /api/chat/generate:', error);
    res.status(500).json({ error: formatApiError(error) });
  }
});


// Audio Studio: Gemini 3.8 Flash TTS (audio generation) and AI-assisted edit planning.
app.post('/api/audio/tts', async (req: Request, res: Response) => {
  try {
    const { text, style, voice } = req.body || {};
    if (!text || typeof text !== 'string') return res.status(400).json({ error: 'Text is required.' });
    if (text.length > 12000) return res.status(400).json({ error: 'Text is too long for one audio generation request.' });
    const apiKey = resolveApiKey(req.headers['x-api-key'] as string | undefined);
    if (!apiKey) return res.status(400).json({ error: 'No Gemini API key is configured.' });

    const payload = {
      model: 'gemini-3.8-flash-tts',
      input: [{ type: 'user_input', content: [{ type: 'text', text, annotations: [{ type: 'speech_metadata', style: style || 'natural, clear and friendly' }] }] }],
      response_format: { type: 'audio', mime_type: 'audio/wav', sample_rate: 24000 },
      generation_config: { speech_config: [{ voice: voice || 'Kore' }] },
    };
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'Gemini TTS request failed.' });
    const audio = data?.output_audio?.data || [...(data?.steps || [])].reverse().flatMap((step: any) => step?.content || []).find((c: any) => c?.type === 'audio')?.data;
    if (!audio) return res.status(502).json({ error: 'Gemini returned no audio data.' });
    res.json({ base64: audio, mimeType: 'audio/wav' });
  } catch (error: any) {
    console.error('Audio TTS error:', error);
    res.status(500).json({ error: formatApiError(error) });
  }
});

app.post('/api/audio/analyze', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType, instruction } = req.body || {};
    if (!audioBase64 || !instruction) return res.status(400).json({ error: 'Audio and an editing instruction are required.' });
    if (audioBase64.length > 30_000_000) return res.status(413).json({ error: 'Audio file is too large.' });
    const apiKey = resolveApiKey(req.headers['x-api-key'] as string | undefined);
    if (!apiKey) return res.status(400).json({ error: 'No Gemini API key is configured.' });
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are Zenith Audio Editor. Analyze the supplied audio only to create a safe, simple edit plan matching the user's instruction. Return ONLY valid JSON with numeric fields when needed: trimStart (seconds), trimEnd (seconds), volume (0 to 2), speed (0.5 to 2), fadeIn (seconds), fadeOut (seconds), normalize (boolean). Do not invent unsupported effects. User instruction: ${instruction}`;
    const result = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: mimeType || 'audio/wav', data: audioBase64 } }] }],
      config: { responseMimeType: 'application/json', temperature: 0.1 },
    });
    let plan: any = {};
    try { plan = JSON.parse(result.text || '{}'); } catch { plan = {}; }
    res.json({ plan });
  } catch (error: any) {
    console.error('Audio analyze error:', error);
    res.status(500).json({ error: formatApiError(error) });
  }
});

// Setup Vite middlewares in development or serve static build in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Zenith AI server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
