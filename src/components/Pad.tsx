import React, { useRef, useState } from 'react';
import type { PadData } from '../types';

function keyHint(index: number) { const M = [ ['Q','W','E','R'], ['A','S','D','F'], ['Z','X','C','V'] ]; const r=Math.floor(index/4), c=index%4; return M[r]?.[c] ?? ''; }
function truncate(s:string,n:number){ return s.length>n ? s.slice(0,n-1)+'…' : s; }

interface PadProps { index:number; pad:PadData; gradient:string; pulsing:boolean; onTrigger:()=>void; onPick:(f:File)=>void; onDropFiles:(files:FileList)=>void; }
export const Pad: React.FC<PadProps> = ({ index, pad, gradient, pulsing, onTrigger, onPick, onDropFiles }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pressing, setPressing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  function onLongPress(){ fileInputRef.current?.click(); }
  return (
    <div className="rounded-2xl p-2 select-none transition-colors" data-pad onDragOver={(e)=>{ e.preventDefault(); setDragOver(true); }} onDragLeave={()=>setDragOver(false)} onDrop={(e)=>{ e.preventDefault(); const files=e.dataTransfer.files; if(files?.length) onDropFiles(files); setDragOver(false); }}>
      <div className="flex items-center justify-between mb-2">
        <button className="text-[11px] px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 truncate" onPointerDown={()=>{ setPressing(true); setTimeout(()=>{ if(pressing) onLongPress(); }, 450); }} onPointerUp={()=>setPressing(false)} onPointerLeave={()=>setPressing(false)} title="長押しで音声を読み込み">
          {pad.name !== 'Empty' ? truncate(pad.name, 18) : `Pad ${index+1}`}
        </button>
        <span className="text-[10px] opacity-60">{keyHint(index)}</span>
      </div>
      <button onClick={onTrigger} onContextMenu={(e)=>{ e.preventDefault(); onLongPress(); }} disabled={!pad.buffer} className={`w-full aspect-square rounded-3xl bg-gradient-to-br ${gradient} border border-white/10 ${pulsing?'pulse':''} glow active:scale-[0.98] transition-transform ${dragOver?'ring-2 ring-white/60':''}`}
        aria-label={`Trigger pad ${index+1} ${pad.name!=='Empty'?pad.name:''}`}
      />
      <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) onPick(f); if(fileInputRef.current) fileInputRef.current.value=''; }} />
    </div>
  );
};
