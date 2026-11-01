import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(__dirname, '../../translations');
const read = (file: string) => JSON.parse(readFileSync(join(dir, file), 'utf8')).learn.graduation as Record<string, string>;
const english = read('en.json');
const keys = ['body', ...Object.keys(english).filter(key => key.startsWith('recap_'))];

it.each(readdirSync(dir).filter(file => file.endsWith('.json') && file !== 'en.json'))('translates the graduation recap in %s', (file) => {
  const graduation = read(file);
  for (const key of keys)
    expect({ key, text: graduation[key] }).not.toEqual({ key, text: english[key] });
});
