import { PositionFormatError } from './position';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function encodeBytes(bytes: number[]): string {
  let bits = '';
  for (const byte of bytes)
    bits += byte.toString(2).padStart(8, '0');
  return bits.match(/.{1,6}/g)!.map(group => alphabet[Number.parseInt(group.padEnd(6, '0'), 2)]).join('');
}

export function decodeBytes(id: string, length: number): number[] {
  if (!/^[\w+/]+$/.test(id) || id.length !== Math.ceil(length * 8 / 6))
    throw new PositionFormatError('format');
  const bits = [...id].map(char => alphabet.indexOf(char).toString(2).padStart(6, '0')).join('');
  const bytes = Array.from({ length }, (_, i) => Number.parseInt(bits.slice(i * 8, i * 8 + 8), 2));
  if (encodeBytes(bytes) !== id)
    throw new PositionFormatError('format');
  return bytes;
}

export function readBits(bytes: number[], start: number, length: number): number {
  let value = 0;
  for (let i = 0; i < length; i++)
    value += ((bytes[Math.floor((start + i) / 8)]! >> ((start + i) % 8)) & 1) * 2 ** i;
  return value;
}

// eslint-disable-next-line max-params -- byte buffer plus a bit-field triple
export function writeBits(bytes: number[], start: number, length: number, value: number): void {
  for (let i = 0; i < length; i++) {
    if ((value >> i) & 1)
      bytes[Math.floor((start + i) / 8)]! |= 1 << ((start + i) % 8);
  }
}
