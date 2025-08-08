import React, { useEffect, useState } from 'react';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useLocalPresets } from './hooks/useLocalPresets';
import { Pad } from './components/Pad';
import { PadEditor } from './components/PadEditor';
import type { ColorPresets } from './types';

// --- Color presets (12 pads) ---
const COLOR_PRESETS: ColorPresets = {
  Neon: [ 'from-cyan-400 to-cyan-600','from-teal-400 to-teal-600','from-emerald-400 to-emerald-600','from-lime-400 to-lime-600', 'from-yellow-400 to-amber-500','from-orange-400 to-orange-600','from-red-500 to-rose-600','from-pink-400 to-pink-600', 'from-fuchsia-400 to-purple-600','from-indigo-400 to-indigo-600','from-sky-400 to-sky-600','from-blue-400 to-blue-600', ],
  Sunset: [ 'from-rose-400 to-orange-500','from-orange-400 to-amber-500','from-amber-400 to-yellow-500','from-yellow-400 to-lime-500', 'from-rose-400 to-pink-500','from-pink-400 to-fuchsia-500','from-fuchsia-400 to-purple-500','from-purple-400 to-indigo-500', 'from-orange-400 to-rose-500','from-amber-400 to-orange-500','from-rose-400 to-red-500','from-red-400 to-rose-600', ],
  Arcade: [ 'from-emerald-400 to-emerald-600','from-cyan-400 to-sky-600','from-indigo-400 to-indigo-600','from-fuchsia-400 to-purple-600', 'from-lime-400 to-green-600','from-yellow-400 to-amber-600','from-orange-400 to-orange-600','from-red-500 to-rose-600', 'from-teal-400 to-teal-600','from-sky-400 to-blue-600','from-purple-400 to-indigo-600','from-pink-400 to-rose-600', ],
};
const PRESET_KEYS = Object.keys(COLOR_PRESETS);

const KEY_TO_INDEX: Record<string, number> = { q:0,w:1,e:2,r:3,a:4,s:5,d:6,f:7,z:8,x:9,c:10,v:11 };

export default function App(){
  const { pads, setPads, globalVolume, setGlobalVolume, nowPlaying, setNowPlaying, triggerPad, assignFile, assignFilesFrom, stopAll, decode } = useAudioEngine(12);
  const { presets, save, load, remove, loadingId } = useLocalPresets(pads, (p)=>setPads(p.concat(Array.from({length:12-p.length},()=>({ name:'Empty', buffer:null, volume:0.95, pitch:1, loop:false, choke:true }))).slice(0,12)) );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [preset, setPreset] = useState(PRESET_KEYS[0]);
  const [pulsePad, setPulsePad] = useState<number | null>(null);
  const [newPresetName, setNewPresetName] = useState('');

  // Keyboard listener
  useEffect(()=>{ function handleKey(e:KeyboardEvent){ const idx = KEY_TO_INDEX[e.key.toLowerCase()]; if(idx!==undefined){ e.preventDefault(); triggerPad(idx); setPulse(idx); } } window.addEventListener('keydown', handleKey); return ()=>window.removeEventListener('keydown', handleKey); }, [triggerPad]);

  function setPulse(i:number){ setPulsePad(i); setTimeout(()=>setPulsePad(null), 180); }

  function onDrop(ev: React.DragEvent){ ev.preventDefault(); const t = ev.target as HTMLElement; if (t.closest('[data-pad]')) return; const files = ev.dataTransfer?.files; if(!files?.length) return; let idx = pads.findIndex(p=>!p.buffer); if(idx===-1) idx=0; assignFilesFrom(idx, files); }

  function saveCurrent(){ save(newPresetName); setNewPresetName(''); }
  async function loadPreset(p:any){ await load(p, decode); }

  return (
    <div className="min-h-screen bg-black text-white pb-28" onDrop={onDrop} onDragOver={(e)=>e.preventDefault()}>
      <style>{`@keyframes padPulse {0%{transform:scale(1);}50%{transform:scale(0.96) translateZ(0);}100%{transform:scale(1);} } .pulse{animation:padPulse 180ms ease-out;} .glow{box-shadow:0 0 24px rgba(255,255,255,0.08), inset 0 0 8px rgba(255,255,255,0.06);}`}</style>
      <div className="px-4 pt-5 pb-2 flex items-center justify-between">
        <div className="text-lg font-bold tracking-wide">VIBE-PADS</div>
        <button onClick={()=>setSheetOpen(true)} className="px-3 py-2 rounded-full bg-white/10 hover:bg-white/20">Settings</button>
      </div>
      {nowPlaying && <div className="mx-4 mb-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs truncate">Now Playing: {nowPlaying}</div>}
      <div className="grid grid-cols-3 gap-3 px-4">
        {pads.map((pad,i)=>{ const grad = COLOR_PRESETS[preset][i%12]; return <Pad key={i} index={i} pad={pad} gradient={grad} pulsing={pulsePad===i} onTrigger={()=>{ triggerPad(i); setPulse(i); }} onPick={(f)=>assignFile(i,f)} onDropFiles={(files)=>assignFilesFrom(i,files)} />; })}
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
                <select value={preset} onChange={(e)=>setPreset(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs">{PRESET_KEYS.map(k=> <option key={k} value={k}>{k}</option>)}</select>
              </div>
              <div className="col-span-2"><PadEditor pads={pads} setPads={setPads} /></div>
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-1"><span className="text-xs font-semibold opacity-80">Pad Presets</span></div>
                <div className="flex gap-2 mb-2">
                  <input value={newPresetName} onChange={e=>setNewPresetName(e.target.value)} placeholder="Preset name" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs" />
                  <button onClick={saveCurrent} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs">Save</button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {presets.length===0 && <div className="text-[11px] opacity-60">No presets yet.</div>}
                  {presets.map(p=> (
                    <div key={p.id} className="flex items-center gap-2 text-[11px] bg-white/5 border border-white/10 rounded-xl px-2 py-1">
                      <div className="flex-1 truncate">{p.name}</div>
                      <button disabled={loadingId===p.id} onClick={()=>loadPreset(p)} className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40">{loadingId===p.id?'...':'Load'}</button>
                      <button onClick={()=>remove(p.id)} className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20">Del</button>
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
