import React, { useEffect, useState } from 'react';

interface Toast {
  id: string;
  type: 'info' | 'error' | 'success';
  message: string;
  ttl?: number;
}

let externalPush: (t: Omit<Toast, 'id'>) => void;
export const pushToast = (t: Omit<Toast, 'id'>) => externalPush?.(t);

export const Toaster: React.FC = () => {
  const [list, setList] = useState<Toast[]>([]);
  externalPush = t => {
    const toast: Toast = { id: crypto.randomUUID(), ttl: 4000, ...t };
    setList(prev => [...prev, toast]);
  };
  useEffect(() => {
    const timers = list.map(t => setTimeout(() => setList(l => l.filter(x => x.id !== t.id)), t.ttl));
    return () => timers.forEach(clearTimeout);
  }, [list]);
  return (
    <div style={{ position:'fixed', top:12, right:12, display:'flex', flexDirection:'column', gap:8, zIndex:9999 }} aria-live="polite">
      {list.map(t => (
        <div key={t.id} style={{ background: t.type==='error'? '#dc2626': t.type==='success'? '#16a34a':'#334155', color:'#fff', padding:'8px 12px', borderRadius:6, fontSize:14, boxShadow:'0 2px 6px rgba(0,0,0,.3)' }}>{t.message}</div>
      ))}
    </div>
  );
};
