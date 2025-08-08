import { useCallback, useState } from 'react';
import type { PadData, PadPreset, PadPresetPad } from '../types';

const PRESET_STORE_KEY = 'vibePadPresetsV1';

function loadStored(): PadPreset[] {
  try { const j = localStorage.getItem(PRESET_STORE_KEY); return j?JSON.parse(j):[]; } catch { return []; }
}
function saveStored(list:PadPreset[]){ try { localStorage.setItem(PRESET_STORE_KEY, JSON.stringify(list)); } catch {}
}

export function useLocalPresets(pads: PadData[], setPads: (pads:PadData[])=>void){
  const [presets, setPresets] = useState<PadPreset[]>(()=>loadStored());
  const [loadingId, setLoadingId] = useState<string|null>(null);

  const save = useCallback((nameRaw:string)=>{
    const name = nameRaw.trim() || `Preset ${new Date().toLocaleString()}`;
    const preset: PadPreset = {
      id: crypto.randomUUID(), name, created: Date.now(),
      pads: pads.map(p=>({ name:p.name, volume:p.volume, pitch:p.pitch, loop:p.loop, choke:p.choke, rawData:p.rawData||null }))
    };
    const list=[preset, ...presets].slice(0,30); setPresets(list); saveStored(list);
  }, [pads, presets]);

  const remove = useCallback((id:string)=>{ const list=presets.filter(p=>p.id!==id); setPresets(list); saveStored(list); }, [presets]);

  const load = useCallback(async(preset:PadPreset, decode:(arr:ArrayBuffer)=>Promise<AudioBuffer>)=>{
    setLoadingId(preset.id);
    const next:PadData[]=[];
    for(const pp of preset.pads){
      let buffer:AudioBuffer|null=null;
      if(pp.rawData){ try{ const arr=base64ToArrayBuffer(pp.rawData); buffer= await decode(arr.slice(0)); }catch{} }
      next.push({ name:pp.name, buffer, volume:pp.volume, pitch:pp.pitch, loop:pp.loop, choke:pp.choke, rawData:pp.rawData||undefined });
    }
    setPads(next);
    setLoadingId(null);
  }, [setPads]);

  return { presets, save, load, remove, loadingId };
}

function base64ToArrayBuffer(b64:string){ const bin=atob(b64); const len=bin.length; const bytes=new Uint8Array(len); for(let i=0;i<len;i++) bytes[i]=bin.charCodeAt(i); return bytes.buffer; }
