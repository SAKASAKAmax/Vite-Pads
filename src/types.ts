// Shared types for pads
export interface PadData {
  name: string;
  buffer: AudioBuffer | null;
  volume: number;
  pitch: number;
  loop: boolean;
  choke: boolean;
  thumb?: string;
  rawData?: string; // base64 for persistence
}

export function defaultPad(): PadData {
  return { name: 'Empty', buffer: null, volume: 0.95, pitch: 1.0, loop: false, choke: true };
}
