import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';

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
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
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
  } catch (e) {
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
  } catch (e) {
    return [];
  }
}

export async function performLiveWebSearch(
  query: string,
  contextQuery?: string
): Promise<WebSearchResult[]> {
  let effectiveQuery = query.trim().replace(/^["']|["']$/g, '');
  if (
    contextQuery &&
    effectiveQuery.length < 25 &&
    /what about|how about|tell me more|expand on/i.test(effectiveQuery)
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

  const [ddgRes, newsRes] = await Promise.allSettled([
    searchDuckDuckGoHtml(effectiveQuery),
    searchGoogleNews(effectiveQuery),
  ]);
  const results: WebSearchResult[] = [];
  const seen = new Set<string>();
  const ddgList = ddgRes.status === 'fulfilled' ? ddgRes.value : [];
  const newsList = newsRes.status === 'fulfilled' ? newsRes.value : [];
  for (const item of [...ddgList, ...newsList]) {
    if (!seen.has(item.url)) {
      seen.add(item.url);
      results.push(item);
    }
  }
  return results.slice(0, 10);
}

async function test() {
  const query = 'What are the latest major AI news stories from the last 7 days?';
  const results = await performLiveWebSearch(query);
  console.log('Results count:', results.length);
  for (const r of results.slice(0, 5)) {
    console.log(`- [${r.source}] ${r.title} (${r.date})`);
    console.log(`  URL: ${r.url}`);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  const searchContext = results
    .map(
      (r, i) =>
        `[Source ${i + 1}]: "${r.title}"\nPublisher: ${r.source}\nDate: ${r.date || 'Recent'}\nURL: ${r.url}\nSummary: ${r.snippet}`
    )
    .join('\n\n');

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

  const prompt = [
    `Current Real-World Date: ${currentDate}.`,
    'You are Zenith AI in Web Search mode. A live web search was conducted for the user query.',
    'Verified live web search results from the last 7 days:',
    searchContext,
    '',
    'Instructions:',
    '1. Answer the question thoroughly based directly on these recent live web search results from September 2026.',
    '2. Explicitly cite your sources inline using clickable Markdown links [Publisher Name](URL).',
    '3. Provide a dedicated "### Sources" section at the end with all cited links.',
    '4. Emphasize actual recent developments and real publishers.',
  ].join('\n');

  console.log('\n--- Generating response with gemini-3.8-flash ---');
  let genRes: any;
  for (const m of ['gemini-3.8-flash', 'gemini-3.1-flash-lite']) {
    try {
      genRes = await ai.models.generateContent({
        model: m,
        contents: [
          { role: 'user', parts: [{ text: query }] },
          { role: 'model', parts: [{ text: 'Understood, searching the web...' }] },
          { role: 'user', parts: [{ text: prompt }] },
        ],
      });
      if (genRes) {
        console.log(`Generated with ${m}:`);
        console.log(genRes.text);
        break;
      }
    } catch (e: any) {
      console.warn(`Model ${m} failed:`, e?.message);
    }
  }
}

test().catch(console.error);
