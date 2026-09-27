import React, { useEffect, useRef, useState } from 'react';
import { Download, Music2, Pause, Play, RotateCcw, Sparkles, Trash2, Upload, Volume2, X } from 'lucide-react';
import { api } from '../services/api';

interface AudioStudioProps { onClose: () => void; customApiKey?: string; }

type AudioPlan = { trimStart?: number; trimEnd?: number; volume?: number; speed?: number; fadeIn?: number; fadeOut?: number; normalize?: boolean };

function encodeWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const frames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = frames * blockAlign;
  const out = new ArrayBuffer(44 + dataSize);
  const view = new DataView(out);
  const write = (offset: number, text: string) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  write(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); write(8, 'WAVE'); write(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true); view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true); offset += 2;
    }
  }
  return new Blob([out], { type: 'audio/wav' });
}

async function processAudio(input: AudioBuffer, plan: AudioPlan): Promise<AudioBuffer> {
  const sampleRate = input.sampleRate;
  const start = Math.max(0, plan.trimStart ?? 0);
  const end = Math.min(input.duration, plan.trimEnd ?? input.duration);
  const speed = Math.max(0.25, Math.min(4, plan.speed ?? 1));
  const duration = Math.max(0.01, (end - start) / speed);
  const ctx = new OfflineAudioContext(input.numberOfChannels, Math.ceil(duration * sampleRate), sampleRate);
  const source = ctx.createBufferSource(); source.buffer = input; source.playbackRate.value = speed;
  const gain = ctx.createGain(); gain.gain.value = Math.max(0, Math.min(4, plan.volume ?? 1));
  source.connect(gain); gain.connect(ctx.destination); source.start(0, start, end - start);
  const rendered = await ctx.startRendering();
  const fadeIn = Math.min(rendered.duration / 2, Math.max(0, plan.fadeIn ?? 0));
  const fadeOut = Math.min(rendered.duration / 2, Math.max(0, plan.fadeOut ?? 0));
  for (let c = 0; c < rendered.numberOfChannels; c++) {
    const data = rendered.getChannelData(c);
    let peak = 0;
    if (plan.normalize) for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
    const normalizer = plan.normalize && peak > 0 ? Math.min(1 / peak, 4) : 1;
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      let g = normalizer;
      if (fadeIn > 0 && t < fadeIn) g *= t / fadeIn;
      if (fadeOut > 0 && t > rendered.duration - fadeOut) g *= (rendered.duration - t) / fadeOut;
      data[i] *= g;
    }
  }
  return rendered;
}

export const AudioStudio: React.FC<AudioStudioProps> = ({ onClose, customApiKey }) => {
  const [file, setFile] = useState<File | null>(null);
  const [inputUrl, setInputUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [instruction, setInstruction] = useState('');
  const [plan, setPlan] = useState<AudioPlan>({ volume: 1, speed: 1 });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Upload an audio file or generate speech from text.');
  const [ttsText, setTtsText] = useState('');
  const [playing, setPlaying] = useState<'input' | 'output' | null>(null);
  const inputAudio = useRef<HTMLAudioElement>(null);
  const outputAudio = useRef<HTMLAudioElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (inputUrl) URL.revokeObjectURL(inputUrl); if (outputUrl) URL.revokeObjectURL(outputUrl); }, [inputUrl, outputUrl]);

  const loadFile = (f: File) => {
    if (!f.type.startsWith('audio/')) { setStatus('Please choose an audio file.'); return; }
    if (f.size > 25 * 1024 * 1024) { setStatus('Audio must be under 25 MB.'); return; }
    if (inputUrl) URL.revokeObjectURL(inputUrl); if (outputUrl) URL.revokeObjectURL(outputUrl);
    const url = URL.createObjectURL(f); setFile(f); setInputUrl(url); setOutputUrl(null); setPlan({ volume: 1, speed: 1 }); setStatus('Audio loaded.');
    const a = new Audio(url); a.onloadedmetadata = () => setDuration(a.duration);
  };

  const applyEdit = async (editPlan = plan) => {
    if (!file) { setStatus('Upload an audio file first.'); return; }
    setBusy(true); setStatus('Processing audio…');
    try {
      const array = await file.arrayBuffer(); const ctx = new AudioContext(); const decoded = await ctx.decodeAudioData(array.slice(0)); await ctx.close();
      const rendered = await processAudio(decoded, editPlan); const blob = encodeWav(rendered);
      if (outputUrl) URL.revokeObjectURL(outputUrl); setOutputUrl(URL.createObjectURL(blob)); setStatus('Edited WAV is ready.');
    } catch (e: any) { setStatus(e?.message || 'Could not process this audio file.'); }
    finally { setBusy(false); }
  };

  const aiEdit = async () => {
    if (!file) { setStatus('Upload an audio file first.'); return; }
    if (!instruction.trim()) { setStatus('Describe how you want the audio edited.'); return; }
    setBusy(true); setStatus('Analyzing your audio instruction…');
    try {
      const base64 = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(',')[1] || ''); r.onerror = () => reject(r.error); r.readAsDataURL(file); });
      const aiPlan = await api.analyzeAudio({ audioBase64: base64, mimeType: file.type || 'audio/wav', instruction, customApiKey });
      const next = { ...plan, ...aiPlan }; setPlan(next); await applyEdit(next);
    } catch (e: any) { setStatus(e?.message || 'AI audio editing is unavailable right now.'); setBusy(false); }
  };

  const generateTts = async () => {
    if (!ttsText.trim()) { setStatus('Enter text to generate audio.'); return; }
    setBusy(true); setStatus('Generating speech…');
    try {
      const data = await api.generateTts({ text: ttsText.trim(), style: instruction.trim() || 'natural, clear and friendly', voice: 'Kore', customApiKey });
      const bytes = Uint8Array.from(atob(data.base64), c => c.charCodeAt(0)); const blob = new Blob([bytes], { type: data.mimeType || 'audio/wav' });
      if (outputUrl) URL.revokeObjectURL(outputUrl); setOutputUrl(URL.createObjectURL(blob)); setStatus('Generated audio is ready.');
    } catch (e: any) { setStatus(e?.message || 'TTS generation failed.'); }
    finally { setBusy(false); }
  };

  const toggle = (kind: 'input' | 'output') => { const el = kind === 'input' ? inputAudio.current : outputAudio.current; if (!el) return; if (!el.paused) { el.pause(); setPlaying(null); } else { void el.play(); setPlaying(kind); } };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm">
    <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-[#2F3547] dark:bg-[#181B26]">
      <div className="mb-4 flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-lg font-semibold"><Music2 className="h-5 w-5 text-indigo-500" />Audio Studio</h2><p className="text-xs text-slate-500">Generate speech or edit an uploaded audio file.</p></div><button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div>
      <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><div className="mb-2 text-sm font-semibold">Generate Audio</div><textarea value={ttsText} onChange={e => setTtsText(e.target.value)} placeholder="Type what Zenith should say…" className="min-h-24 w-full rounded-xl bg-slate-100 p-3 text-sm outline-none dark:bg-slate-800"/><button disabled={busy} onClick={generateTts} className="mt-3 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Sparkles className="h-4 w-4" />Generate speech</button></section>
      <section className="mt-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><div className="mb-3 flex items-center justify-between"><div className="text-sm font-semibold">Edit Audio</div><button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs"><Upload className="h-4 w-4" />Upload</button><input ref={fileRef} hidden type="file" accept="audio/*" onChange={e => e.target.files?.[0] && loadFile(e.target.files[0])}/></div>{file && <div className="mb-3 rounded-xl bg-slate-100 p-3 text-xs dark:bg-slate-800">{file.name} · {duration.toFixed(1)}s</div>}<textarea value={instruction} onChange={e => setInstruction(e.target.value)} placeholder="Example: make it 1.25x faster, normalize volume, and fade in for 1 second" className="min-h-20 w-full rounded-xl bg-slate-100 p-3 text-sm outline-none dark:bg-slate-800"/><button disabled={busy || !file} onClick={aiEdit} className="mt-3 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"><Sparkles className="h-4 w-4" />AI edit & apply</button><div className="mt-3 grid grid-cols-2 gap-3"><label className="text-xs">Volume<input type="range" min="0" max="2" step="0.05" value={plan.volume ?? 1} onChange={e => setPlan({...plan, volume:Number(e.target.value)})} className="w-full"/></label><label className="text-xs">Speed<input type="range" min="0.5" max="2" step="0.05" value={plan.speed ?? 1} onChange={e => setPlan({...plan, speed:Number(e.target.value)})} className="w-full"/></label><label className="text-xs">Trim start (sec)<input type="number" min="0" max={duration} value={plan.trimStart ?? 0} onChange={e => setPlan({...plan, trimStart:Number(e.target.value)})} className="mt-1 w-full rounded-lg bg-slate-100 p-2 dark:bg-slate-800"/></label><label className="text-xs">Trim end (sec)<input type="number" min="0" max={duration} placeholder={duration.toFixed(1)} value={plan.trimEnd ?? ''} onChange={e => setPlan({...plan, trimEnd:e.target.value ? Number(e.target.value) : undefined})} className="mt-1 w-full rounded-lg bg-slate-100 p-2 dark:bg-slate-800"/></label></div><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => setPlan({...plan, normalize:true})} className="rounded-lg border px-3 py-1.5 text-xs">Normalize</button><button onClick={() => setPlan({...plan, fadeIn:1, fadeOut:1})} className="rounded-lg border px-3 py-1.5 text-xs">1s Fades</button><button disabled={busy || !file} onClick={() => applyEdit()} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs text-white disabled:opacity-50">Apply manual edits</button></div></section>
      <div className="mt-4 text-xs text-slate-500">{status}</div>
      {(inputUrl || outputUrl) && <div className="mt-3 space-y-2">{inputUrl && <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-2 dark:bg-slate-800"><button onClick={() => toggle('input')} className="rounded-full p-2">{playing === 'input' ? <Pause className="h-4 w-4"/> : <Play className="h-4 w-4"/>}</button><Volume2 className="h-4 w-4"/><audio ref={inputAudio} src={inputUrl} onEnded={() => setPlaying(null)} className="hidden"/><span className="text-xs">Original audio</span></div>}{outputUrl && <div className="flex items-center gap-2 rounded-xl bg-indigo-50 p-2 dark:bg-indigo-950/30"><button onClick={() => toggle('output')} className="rounded-full p-2">{playing === 'output' ? <Pause className="h-4 w-4"/> : <Play className="h-4 w-4"/>}</button><audio ref={outputAudio} src={outputUrl} onEnded={() => setPlaying(null)} className="hidden"/><span className="flex-1 text-xs">Processed / generated audio</span><a href={outputUrl} download={ttsText ? 'zenith-generated.wav' : 'zenith-edited.wav'} className="rounded-lg bg-indigo-600 p-2 text-white"><Download className="h-4 w-4"/></a></div>}</div>}
    </div>
  </div>;
};
