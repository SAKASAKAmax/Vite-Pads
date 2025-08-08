import { useCallback, useEffect, useRef, useState } from 'react';
import type { PadData } from '../types';
import { defaultPad } from '../types';

function arrayBufferToBase64(buf:ArrayBuffer){ let b=''; const bytes=new Uint8Array(buf); for(let i=0;i<bytes.length;i++) b+=String.fromCharCode(bytes[i]); return btoa(b); }

export function useAudioEngine(padCount:number){
  const [pads, setPads] = useState<PadData[]>(()=>Array.from({length:padCount}, defaultPad));
  const [globalVolume, setGlobalVolume] = useState(0.95);
  const [nowPlaying, setNowPlaying] = useState('');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const activeVoicesRef = useRef<Record<number, {source:AudioBufferSourceNode;gain:GainNode}[]>>({});

  useEffect(()=>{
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    const ctx: AudioContext = new Ctx();
    const master = ctx.createGain(); master.gain.value = globalVolume; master.connect(ctx.destination);
    audioCtxRef.current = ctx; masterGainRef.current = master;
    return ()=>{ ctx.close(); };
  }, []);
  useEffect(()=>{ if(masterGainRef.current) masterGainRef.current.gain.value = globalVolume; }, [globalVolume]);

  const stopAll = useCallback(()=>{ Object.values(activeVoicesRef.current).forEach(voices => voices.forEach(v=>{ try{v.source.stop();}catch{} })); activeVoicesRef.current={}; }, []);
  const stopVoicesOnPad = useCallback((i:number)=>{ (activeVoicesRef.current[i]||[]).forEach(v=>{ try{v.source.stop();}catch{} }); activeVoicesRef.current[i]=[]; }, []);

  const triggerPad = useCallback((i:number)=>{
    const ctx=audioCtxRef.current, master=masterGainRef.current; if(!ctx||!master)return;
    if(ctx.state==='suspended') ctx.resume();
    const pad=pads[i]; if(!pad.buffer) return;
    if(pad.choke) stopVoicesOnPad(i);
    const src=ctx.createBufferSource(); src.buffer=pad.buffer; src.loop=pad.loop; src.playbackRate.value=pad.pitch;
    const g=ctx.createGain(); g.gain.value=pad.volume; src.connect(g).connect(master);
    activeVoicesRef.current[i]=[...(activeVoicesRef.current[i]||[]), {source:src,gain:g}];
    src.onended=()=>{ activeVoicesRef.current[i]=(activeVoicesRef.current[i]||[]).filter(v=>v.source!==src); };
    src.start();
    setNowPlaying(pad.name || `Pad ${i+1}`);
    if (navigator.vibrate) navigator.vibrate(18);
  }, [pads, stopVoicesOnPad]);

  const assignFile = useCallback(async(i:number,file:File)=>{
    const ctx = audioCtxRef.current; if(!ctx) return;
    const arr = await file.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arr.slice(0));
    const b64 = arrayBufferToBase64(arr);
    setPads(prev=>prev.map((p,idx)=>idx===i?{...p, buffer, name:file.name, rawData:b64}:p));
  }, []);

  const assignFilesFrom = useCallback((start:number, files:FileList)=>{ let idx=start; Array.from(files).forEach(f=>{ assignFile(idx,f); idx=(idx+1)%pads.length; }); }, [assignFile, pads.length]);

  const decode = useCallback(async(arr:ArrayBuffer)=>{
    const ctx = audioCtxRef.current; if(!ctx) throw new Error('AudioContext not ready');
    return ctx.decodeAudioData(arr);
  }, []);

  return { pads, setPads, globalVolume, setGlobalVolume, nowPlaying, setNowPlaying, triggerPad, assignFile, assignFilesFrom, stopAll, decode };
}
