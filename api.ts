import { Message } from '../types/chat';

export interface StreamChatOptions {
  modelId: string;
  systemInstruction?: string;
  mode?: string;
  history: Message[];
  prompt: string;
  image?: string | null;
  temperature?: number;
  customApiKey?: string;
  onChunk: (chunk: string) => void;
  signal?: AbortSignal;
}

export interface AudioAnalysisOptions {
  audioBase64: string;
  mimeType: string;
  instruction: string;
  customApiKey?: string;
}

export interface TtsOptions {
  text: string;
  style?: string;
  voice?: string;
  customApiKey?: string;
}

function headers(customApiKey?: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (customApiKey?.trim()) h['x-api-key'] = customApiKey.trim();
  return h;
}

async function readError(response: Response): Promise<string> {
  let msg = `Server error (${response.status})`;
  try { const json = await response.json(); if (json?.error) msg = json.error; } catch {}
  return msg;
}

export const api = {
  async streamChat(options: StreamChatOptions): Promise<string> {
    const { modelId, systemInstruction, mode, history, prompt, image, temperature, customApiKey, onChunk, signal } = options;
    const response = await fetch('/api/chat', {
      method: 'POST', headers: headers(customApiKey),
      body: JSON.stringify({ modelId, systemInstruction, mode, history, prompt, image, temperature }), signal,
    });
    if (!response.ok) throw new Error(await readError(response));
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response body is null');
    const decoder = new TextDecoder('utf-8'); let fullText = ''; let buffer = '';
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim(); if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim(); if (payload === '[DONE]') return fullText;
        try { const parsed = JSON.parse(payload); if (parsed.error) throw new Error(parsed.error); if (parsed.text) { fullText += parsed.text; onChunk(parsed.text); } }
        catch (e: any) { if (e?.message && !e.message.includes('JSON')) throw e; }
      }
    }
    return fullText;
  },

  async generateChat(options: Omit<StreamChatOptions, 'onChunk'>): Promise<string> {
    const { modelId, systemInstruction, mode, history, prompt, image, temperature, customApiKey } = options;
    const response = await fetch('/api/chat/generate', {
      method: 'POST', headers: headers(customApiKey),
      body: JSON.stringify({ modelId, systemInstruction, mode, history, prompt, image, temperature }),
    });
    if (!response.ok) throw new Error(await readError(response));
    const data = await response.json(); return data.text || '';
  },

  async analyzeAudio(options: AudioAnalysisOptions): Promise<Record<string, number | boolean>> {
    const response = await fetch('/api/audio/analyze', {
      method: 'POST', headers: headers(options.customApiKey), body: JSON.stringify(options),
    });
    if (!response.ok) throw new Error(await readError(response));
    const data = await response.json(); return data.plan || {};
  },

  async generateTts(options: TtsOptions): Promise<{ base64: string; mimeType: string }> {
    const response = await fetch('/api/audio/tts', {
      method: 'POST', headers: headers(options.customApiKey), body: JSON.stringify(options),
    });
    if (!response.ok) throw new Error(await readError(response));
    return response.json();
  },
};
