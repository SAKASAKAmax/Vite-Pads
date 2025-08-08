import React, { useState } from 'react';
import type { PadData } from '../types';
import { defaultPad } from '../types';

interface PadEditorProps { pads:PadData[]; setPads:React.Dispatch<React.SetStateAction<PadData[]>>; }
export function PadEditor({ pads, setPads }: PadEditorProps){
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
