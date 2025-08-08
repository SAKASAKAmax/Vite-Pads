import React from 'react';
import { pushToast } from './Toaster';

export class ErrorBoundary extends React.Component<{children:React.ReactNode},{hasError:boolean}> {
  constructor(props:any){ super(props); this.state={hasError:false}; }
  static getDerivedStateFromError(){ return { hasError:true }; }
  componentDidCatch(err:any){ console.error(err); pushToast({ type:'error', message:'エラーが発生しました。再読み込みしてください。' }); }
  render(){ if(this.state.hasError) return <div className="p-4 text-red-400">問題が発生しました。</div>; return this.props.children; }
}
