import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const dir = path.join(__dirname, '../../translations');
const locales = readdirSync(dir).filter(file => file.endsWith('.json'));

// The win-rate label sits under a percentage; "Wins" there reads as a count.
it.each(locales)('%s labels the win rate differently from the win count', (file) => {
  const stats = JSON.parse(readFileSync(path.join(dir, file), 'utf8')).stats as Record<string, string>;
  expect(stats.win_rate.trim().toLowerCase()).not.toBe(stats.won.trim().toLowerCase());
});
