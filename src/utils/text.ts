export function keyHint(index: number) { const M = [ ['Q','W','E','R'], ['A','S','D','F'], ['Z','X','C','V'] ]; const r=Math.floor(index/4), c=index%4; return M[r]?.[c] ?? ''; }
export function truncate(s:string,n:number){ return s.length>n ? s.slice(0,n-1)+'…' : s; }
