import type * as StartupMarker from './startup-marker';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

it('logs the startup marker exactly once per runtime', () => {
  const info = jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.isolateModules(() => {
    const { markStartupReady, STARTUP_READY_MARKER } = jest.requireActual<typeof StartupMarker>('./startup-marker');
    markStartupReady();
    markStartupReady();
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith(STARTUP_READY_MARKER);
  });
  info.mockRestore();
});

it('matches the token the CI startup script waits for', () => {
  const { STARTUP_READY_MARKER } = jest.requireActual<typeof StartupMarker>('./startup-marker');
  const script = readFileSync(join(process.cwd(), '.github/scripts/measure-android-startup.sh'), 'utf8');
  expect(script).toContain(`STARTUP_MARKER='${STARTUP_READY_MARKER}'`);
});
