// Central type definitions
export interface PadData {
  name: string;
  buffer: AudioBuffer | null;
  volume: number;
  pitch: number;
  loop: boolean;
  choke: boolean;
  thumb?: string;
  rawData?: string; // base64 serialized original file
}
export function defaultPad(): PadData { return { name: 'Empty', buffer: null, volume: 0.95, pitch: 1.0, loop: false, choke: true }; }

export interface PadPresetPad { name:string; volume:number; pitch:number; loop:boolean; choke:boolean; rawData?:string|null; }
export interface PadPreset { id:string; name:string; created:number; pads:PadPresetPad[]; }

export interface ColorPresets { [name:string]: string[]; }
