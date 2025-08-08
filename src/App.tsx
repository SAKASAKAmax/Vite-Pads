import React, { useEffect, useRef, useState } from 'react';

// --- Color presets (12 pads) ---
const COLOR_PRESETS: Record<string, string[]> = {
  Neon: [
    'from-cyan-400 to-cyan-600','from-teal-400 to-teal-600','from-emerald-400 to-emerald-600','from-lime-400 to-lime-600',
    'from-yellow-400 to-amber-500','from-orange-400 to-orange-600','from-red-500 to-rose-600','from-pink-400 to-pink-600',
    'from-fuchsia-400 to-purple-600','from-indigo-400 to-indigo-600','from-sky-400 to-sky-600','from-blue-400 to-blue-600',
  ],
  Sunset: [
    'from-rose-400 to-orange-500','from-orange-400 to-amber-500','from-amber-400 to-yellow-500','from-yellow-400 to-lime-500',
    'from-rose-400 to-pink-500','from-pink-400 to-fuchsia-500','from-fuchsia-400 to-purple-500','from-purple-400 to-indigo-500',
    'from-orange-400 to-rose-500','from-amber-400 to-orange-500','from-rose-400 to-red-500','from-red-400 to-rose-600',
  ],
  Arcade: [
    'from-emerald-400 to-emerald-600','from-cyan-400 to-sky-600','from-indigo-400 to-indigo-600','from-fuchsia-400 to-purple-600',
    'from-lime-400 to-green-600','from-yellow-400 to-amber-600','from-orange-400 to-orange-600','from-red-500 to-rose-600',
    'from-teal-400 to-teal-600','from-sky-400 to-blue-600','from-purple-400 to-indigo-600','from-pink-400 to-rose-600',
  ],
};
const PRESET_KEYS = Object.keys(COLOR_PRESETS);

interface PadData {
  name: string;
  buffer: AudioBuffer | null;
  volume: number;
  pitch: number;
  loop: boolean;
  choke: boolean;
  thumb?: string;
  rawData?: string; // base64 (ArrayBuffer) for preset persistence
}
function defaultPad(): PadData { return { name: 'Empty', buffer: null, volume: 0.95, pitch: 1.0, loop: false, choke: true }; }

// Preset types
interface PadPresetPad { name:string; volume:number; pitch:number; loop:boolean; choke:boolean; rawData?:string|null; }
interface PadPreset { id:string; name:string; created:number; pads:PadPresetPad[]; }
const PRESET_STORE_KEY = 'vibePadPresetsV1';
function loadStoredPresets(): PadPreset[] { try { const j = localStorage.getItem(PRESET_STORE_KEY); return j?JSON.parse(j):[]; } catch { return []; } }
function saveStoredPresets(list:PadPreset[]) { try { localStorage.setItem(PRESET_STORE_KEY, JSON.stringify(list)); } catch {} }
function arrayBufferToBase64(buf:ArrayBuffer){ let b=''; const bytes=new Uint8Array(buf); for(let i=0;i<bytes.length;i++) b+=String.fromCharCode(bytes[i]); return btoa(b); }
function base64ToArrayBuffer(b64:string){ const bin=atob(b64); const len=bin.length; const bytes=new Uint8Array(len); for(let i=0;i<len;i++) bytes[i]=bin.charCodeAt(i); return bytes.buffer; }

export default function App() {
  const [pads, setPads] = useState<PadData[]>(() => Array.from({ length: 12 }, defaultPad));
  const [globalVolume, setGlobalVolume] = useState(0.95);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [nowPlaying, setNowPlaying] = useState('');
  const [preset, setPreset] = useState(PRESET_KEYS[0]);
  const [pulsePad, setPulsePad] = useState<number | null>(null);
  // Preset states
  const [presets, setPresets] = useState<PadPreset[]>(()=>loadStoredPresets());
  const [newPresetName, setNewPresetName] = useState('');
  const [loadingPresetId, setLoadingPresetId] = useState<string|null>(null);
  // Keyboard mapping
  const KEY_TO_INDEX: Record<string, number> = { q:0,w:1,e:2,r:3,a:4,s:5,d:6,f:7,z:8,x:9,c:10,v:11 };

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const activeVoicesRef = useRef<Record<number, {source:AudioBufferSourceNode;gain:GainNode}[]>>({});

  // init audio
  useEffect(() => {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    const ctx: AudioContext = new Ctx();
    const master = ctx.createGain(); master.gain.value = globalVolume; master.connect(ctx.destination);
    audioCtxRef.current = ctx; masterGainRef.current = master;
    return () => { ctx.close(); };
  }, []);
  useEffect(() => { if (masterGainRef.current) masterGainRef.current.gain.value = globalVolume; }, [globalVolume]);

  // Keyboard listener
  useEffect(()=>{
    function handleKey(e:KeyboardEvent){ const idx = KEY_TO_INDEX[e.key.toLowerCase()]; if(idx!==undefined){ e.preventDefault(); triggerPad(idx); } }
    window.addEventListener('keydown', handleKey); return ()=>window.removeEventListener('keydown', handleKey);
  }, [pads]);

  function stopAll(){ Object.values(activeVoicesRef.current).forEach(voices => voices.forEach(v=>{ try{v.source.stop();}catch{} })); activeVoicesRef.current = {}; }
  function stopVoicesOnPad(i:number){ (activeVoicesRef.current[i]||[]).forEach(v=>{try{v.source.stop();}catch{}}); activeVoicesRef.current[i]=[]; }

  async function assignFile(i:number,file:File){
    const ctx = audioCtxRef.current; if(!ctx) return;
    const arr = await file.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arr.slice(0));
    const b64 = arrayBufferToBase64(arr);
    setPads(prev=>prev.map((p,idx)=>idx===i?{...p, buffer, name:file.name, rawData:b64}:p));
  }
  function assignFilesFrom(start:number, files:FileList){ let idx=start; Array.from(files).forEach(f=>{ assignFile(idx,f); idx=(idx+1)%pads.length; }); }

  // Global drop (only when not dropping onto a pad)
  function onDrop(ev: React.DragEvent){
    ev.preventDefault();
    const t = ev.target as HTMLElement; if (t.closest('[data-pad]')) return;
    const files = ev.dataTransfer?.files; if(!files?.length) return;
    let idx = pads.findIndex(p=>!p.buffer); if(idx===-1) idx=0;
    assignFilesFrom(idx, files);
  }

  function triggerPad(i:number){
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
    setPulsePad(i); setTimeout(()=>setPulsePad(null), 180);
  }

  // Preset ops
  function saveCurrentAsPreset(){
    const name = newPresetName.trim() || `Preset ${new Date().toLocaleString()}`;
    const preset: PadPreset = { id: crypto.randomUUID(), name, created: Date.now(), pads: pads.map(p=>({ name:p.name, volume:p.volume, pitch:p.pitch, loop:p.loop, choke:p.choke, rawData:p.rawData||null })) };
    const list=[preset, ...presets].slice(0,30); setPresets(list); saveStoredPresets(list); setNewPresetName('');
  }
  async function loadPreset(preset:PadPreset){
    if(!audioCtxRef.current) return; setLoadingPresetId(preset.id);
    const ctx=audioCtxRef.current; const next:PadData[]=[];
    for(const pp of preset.pads){ let buffer:AudioBuffer|null=null; if(pp.rawData){ try{ const arr=base64ToArrayBuffer(pp.rawData); buffer= await ctx.decodeAudioData(arr.slice(0)); }catch{} } next.push({ name:pp.name, buffer, volume:pp.volume, pitch:pp.pitch, loop:pp.loop, choke:pp.choke, rawData:pp.rawData||undefined }); }
    while(next.length<pads.length) next.push(defaultPad());
    setPads(next.slice(0,pads.length)); setLoadingPresetId(null);
  }
  function deletePreset(id:string){ const list=presets.filter(p=>p.id!==id); setPresets(list); saveStoredPresets(list); }

  return (
    <div className="min-h-screen bg-black text-white pb-28" onDrop={onDrop} onDragOver={(e)=>e.preventDefault()}>
      <style>{`@keyframes padPulse {0%{transform:scale(1);}50%{transform:scale(0.96) translateZ(0);}100%{transform:scale(1);} } .pulse{animation:padPulse 180ms ease-out;} .glow{box-shadow:0 0 24px rgba(255,255,255,0.08), inset 0 0 8px rgba(255,255,255,0.06);}`}</style>

      <div className="px-4 pt-5 pb-2 flex items-center justify-between">
        <div className="text-lg font-bold tracking-wide">VIBE-PADS</div>
        <button onClick={()=>setSheetOpen(true)} className="px-3 py-2 rounded-full bg-white/10 hover:bg-white/20">Settings</button>
      </div>

      {nowPlaying && <div className="mx-4 mb-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs truncate">Now Playing: {nowPlaying}</div>}

      <div className="grid grid-cols-3 gap-3 px-4">
        {pads.map((pad,i)=>{
          const grad = COLOR_PRESETS[preset][i%12];
          return <Pad key={i} index={i} pad={pad} gradient={grad} pulsing={pulsePad===i} onTrigger={()=>triggerPad(i)} onPick={(f)=>assignFile(i,f)} onDropFiles={(files)=>assignFilesFrom(i,files)} />;
        })}
      </div>

      <div className="fixed bottom-3 inset-x-0 px-4">
        <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-3 flex items-center justify-between">
          <div className="text-xs opacity-80">Tap pad / QWE R-ASDF-ZXCV keys. Long-press to load. Drag & drop OK.</div>
          <button onClick={stopAll} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs">Stop All</button>
        </div>
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={()=>setSheetOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 rounded-t-3xl bg-[#0f172a] border-t border-white/10 p-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">Settings</div>
              <button onClick={()=>setSheetOpen(false)} className="text-xs opacity-80">Close</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs opacity-80">Master Volume</label>
                <input type="range" min={0} max={1} step={0.01} value={globalVolume} onChange={(e)=>setGlobalVolume(parseFloat(e.target.value))} className="w-full"/>
              </div>
              <div>
                <label className="text-xs opacity-80">Color Preset</label>
                <select value={preset} onChange={(e)=>setPreset(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs">
                  {PRESET_KEYS.map(k=> <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div className="col-span-2"><PadEditor pads={pads} setPads={setPads} /></div>
              {/* Preset UI */}
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-1"><span className="text-xs font-semibold opacity-80">Pad Presets</span></div>
                <div className="flex gap-2 mb-2">
                  <input value={newPresetName} onChange={e=>setNewPresetName(e.target.value)} placeholder="Preset name" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs" />
                  <button onClick={saveCurrentAsPreset} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs">Save</button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {presets.length===0 && <div className="text-[11px] opacity-60">No presets yet.</div>}
                  {presets.map(p=> (
                    <div key={p.id} className="flex items-center gap-2 text-[11px] bg-white/5 border border-white/10 rounded-xl px-2 py-1">
                      <div className="flex-1 truncate">{p.name}</div>
                      <button disabled={loadingPresetId===p.id} onClick={()=>loadPreset(p)} className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40">{loadingPresetId===p.id?'...':'Load'}</button>
                      <button onClick={()=>deletePreset(p.id)} className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20">Del</button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-[10px] opacity-50 leading-snug">音源はブラウザ(localStorage)にbase64保存。容量上限(数MB)に注意。</div>
              </div>
              <div className="col-span-2 text-xs opacity-80">Tips: 長押しで読み込み / キー操作可 / パッド上へ直接D&Dでその位置に挿入。</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PadProps { index:number; pad:PadData; gradient:string; pulsing:boolean; onTrigger:()=>void; onPick:(f:File)=>void; onDropFiles:(files:FileList)=>void; }
function Pad({ index, pad, gradient, pulsing, onTrigger, onPick, onDropFiles }: PadProps){
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pressing, setPressing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  function onLongPress(){ fileInputRef.current?.click(); }
  return (
    <div
      className="rounded-2xl p-2 select-none transition-colors"
      data-pad
      onDragOver={(e)=>{ e.preventDefault(); setDragOver(true); }}
      onDragLeave={()=>setDragOver(false)}
      onDrop={(e)=>{ e.preventDefault(); const files=e.dataTransfer.files; if(files?.length) onDropFiles(files); setDragOver(false); }}
    >
      <div className="flex items-center justify-between mb-2">
        <button
          className="text-[11px] px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 truncate"
          onPointerDown={()=>{ setPressing(true); setTimeout(()=>{ if(pressing) onLongPress(); }, 450); }}
          onPointerUp={()=>setPressing(false)}
          onPointerLeave={()=>setPressing(false)}
          title="長押しで音声を読み込み"
        >
          {pad.name !== 'Empty' ? truncate(pad.name, 18) : `Pad ${index+1}`}
        </button>
        <span className="text-[10px] opacity-60">{keyHint(index)}</span>
      </div>
      <button
        onClick={onTrigger}
        onContextMenu={(e)=>{ e.preventDefault(); onLongPress(); }}
        disabled={!pad.buffer}
        className={`w-full aspect-square rounded-3xl bg-gradient-to-br ${gradient} border border-white/10 ${pulsing?'pulse':''} glow active:scale-[0.98] transition-transform ${dragOver?'ring-2 ring-white/60':''}`}
      />
      <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) onPick(f); if(fileInputRef.current) fileInputRef.current.value=''; }} />
    </div>
  );
}

interface PadEditorProps { pads:PadData[]; setPads:React.Dispatch<React.SetStateAction<PadData[]>>; }
function PadEditor({ pads, setPads }: PadEditorProps){
  const [current, setCurrent] = useState(0);
  const p = pads[current];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-2 mb-2">
        <label className="text-xs">Pad</label>
        <select value={current} onChange={(e)=>setCurrent(parseInt(e.target.value))} className="bg-white/5 border border-white/10 rounded-xl text-xs px-2 py-1">
          {pads.map((_,i)=>(<option key={i} value={i}>{i+1}</option>))}
        </select>
        <span className="text-xs opacity-60 truncate">{p?.name || 'Empty'}</span>
      </div>
      <div className="grid grid-cols-4 gap-3 items-center text-[11px]">
        <label className="col-span-1">Vol</label>
        <input className="col-span-3" type="range" min={0} max={1} step={0.01} value={p?.volume ?? 1} onChange={(e)=>setPads(prev=>prev.map((x,i)=>i===current?{...x, volume: parseFloat(e.target.value)}:x))} />
        <label className="col-span-1">Pitch</label>
        <input className="col-span-3" type="range" min={0.5} max={2} step={0.01} value={p?.pitch ?? 1} onChange={(e)=>setPads(prev=>prev.map((x,i)=>i===current?{...x, pitch: parseFloat(e.target.value)}:x))} />
        <label className="col-span-1">Loop</label>
        <input className="col-span-3" type="checkbox" checked={p?.loop ?? false} onChange={(e)=>setPads(prev=>prev.map((x,i)=>i===current?{...x, loop: e.target.checked}:x))} />
        <label className="col-span-1" title="同じパッドを連打した時に前の音を止めます">同パッド連打でカット</label>
        <input className="col-span-3" type="checkbox" checked={p?.choke ?? true} onChange={(e)=>setPads(prev=>prev.map((x,i)=>i===current?{...x, choke: e.target.checked}:x))} />
        <button onClick={()=>setPads(prev=>prev.map((x,i)=>i===current?{...defaultPad()}:x))} className="col-span-4 mt-1 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20">Clear This Pad</button>
      </div>
    </div>
  );
}

function keyHint(index: number) { const M = [ ['Q','W','E','R'], ['A','S','D','F'], ['Z','X','C','V'] ]; const r=Math.floor(index/4), c=index%4; return M[r]?.[c] ?? ''; }
function truncate(s:string,n:number){ return s.length>n ? s.slice(0,n-1)+'…' : s; }
