import type { Position } from './position';
import { parsePositionJson } from '@/lib/game/load-position';
import { exportGnuid, parseGnuid } from './gnuid';
import { inferBorneOff, newPosition, PositionFormatError, validatePosition } from './position';
import { parseXgid } from './xgid';

export function importPosition(input: string): Position {
  const raw = input.trim();
  if (!raw || raw.length > 12000)
    throw new PositionFormatError('format');
  if (/^(?:https?:\/\/|backgammonmastermind[^:]*:\/\/)/i.test(raw)) {
    let data: string | null;
    try {
      const url = new URL(raw);
      if (!url.pathname.replace(/\/$/, '').endsWith('/position') && url.hostname !== 'position')
        throw new Error('Invalid position link');
      data = url.searchParams.get('data');
      if (!data)
        throw new Error('Invalid position link');
      return validatePosition(JSON.parse(data));
    }
    catch {
      throw new PositionFormatError('format');
    }
  }
  const xgLine = raw.match(/^XGID=[a-o-]{26}:\S+/im);
  if (xgLine)
    return parseXgid(xgLine[0]);
  const gnuPosition = raw.match(/Position[ -]?ID\s*:\s*([\w+/]{14})/i);
  const gnuMatch = raw.match(/Match[ -]?ID\s*:\s*([\w+/]{12})/i);
  if (gnuPosition)
    return parseGnuid(`${gnuPosition[1]}${gnuMatch ? `:${gnuMatch[1]}` : ''}`);
  if (/^XGID=/i.test(raw) || /^[a-o-]{26}:/i.test(raw))
    return parseXgid(raw);
  if (/^[\w+/]{14}(?::[\w+/]{12})?$/.test(raw))
    return parseGnuid(raw);
  if (raw.startsWith('{')) {
    let json: unknown;
    try {
      json = JSON.parse(raw);
    }
    catch { throw new PositionFormatError('format'); }
    if (json && typeof json === 'object' && 'version' in json)
      return validatePosition(json);
    if (!json || typeof json !== 'object' || (!('placements' in json) && !('useStandardSetup' in json)))
      throw new PositionFormatError('format');
    if ('placements' in json && Array.isArray(json.placements)) {
      const points = json.placements.map((item: { point?: number } | null) => item?.point);
      if (new Set(points).size !== points.length)
        throw new PositionFormatError('overlap');
    }
    const loaded = parsePositionJson(raw);
    if (!loaded.ok)
      throw new PositionFormatError('format');
    // Infer off counts only when the old developer JSON omits them.
    const p = newPosition();
    p.points = loaded.state.points.map(point => point.count ? point : { player: null, count: 0 });
    p.bar = loaded.state.bar;
    p.currentPlayer = loaded.state.currentPlayer;
    p.context.turnOwner = p.currentPlayer;
    p.dice = loaded.options.dice ?? [0, 0];
    if (loaded.options.borneOff) {
      p.borneOff = loaded.state.borneOff;
      return validatePosition(p);
    }
    return inferBorneOff(p);
  }
  throw new PositionFormatError('format');
}

export function positionLink(p: Position, origin = 'https://backgammon-mastermind.vercel.app'): string {
  return `${origin.replace(/\/$/, '')}/position?data=${encodeURIComponent(JSON.stringify(validatePosition(p)))}`;
}

export function exportPosition(p: Position, format: 'GNUID' | 'JSON'): string {
  return format === 'GNUID' ? exportGnuid(p) : JSON.stringify(validatePosition(p), null, 2);
}
