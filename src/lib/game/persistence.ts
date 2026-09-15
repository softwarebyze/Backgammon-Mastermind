import type { MoveLogEntry } from './move-log';
import type { PersistedSession } from './persisted-session';
import type { GameState } from './types';
import { getRawString, removeItem, setRawString } from '@/lib/storage';

import {
  makePersistedSession,
  parseLegacyGameState,
  parseLegacyMoveLog,
  parsePersistedSessionJson,
} from './persisted-session';

export const SESSION_STORAGE_KEYS = {
  session: 'ACTIVE_GAME_SESSION',
  pending: 'ACTIVE_GAME_SESSION_PENDING',
  quarantine: 'ACTIVE_GAME_SESSION_QUARANTINE',
  legacyState: 'ACTIVE_GAME_STATE',
  legacyMoveLog: 'ACTIVE_GAME_MOVE_LOG',
  legacyBaseline: 'ACTIVE_GAME_REPLAY_BASELINE',
} as const;

export type QuarantinedSession = {
  error: string;
  raw: string;
  quarantinedAt: number;
};

function parseJsonValue(raw: string | undefined): unknown {
  if (raw === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as unknown;
  }
  catch {
    return undefined;
  }
}

function writeSessionJson(key: string, session: PersistedSession): void {
  setRawString(key, JSON.stringify(session));
}

function commitSession(session: PersistedSession): void {
  writeSessionJson(SESSION_STORAGE_KEYS.pending, session);
  writeSessionJson(SESSION_STORAGE_KEYS.session, session);
  void removeItem(SESSION_STORAGE_KEYS.pending);
  void removeItem(SESSION_STORAGE_KEYS.legacyState);
  void removeItem(SESSION_STORAGE_KEYS.legacyMoveLog);
  void removeItem(SESSION_STORAGE_KEYS.legacyBaseline);
}

function quarantineRaw(raw: string, error: string): void {
  const payload: QuarantinedSession = {
    error,
    raw,
    quarantinedAt: Date.now(),
  };
  setRawString(SESSION_STORAGE_KEYS.quarantine, JSON.stringify(payload));
}

function readValidated(key: string): { session: PersistedSession; raw: string } | null {
  const raw = getRawString(key);
  if (raw === undefined) {
    return null;
  }
  const parsed = parsePersistedSessionJson(raw);
  if (!parsed.ok) {
    quarantineRaw(raw, parsed.error);
    void removeItem(key);
    return null;
  }
  return { session: parsed.session, raw };
}

function migrateLegacySession(): PersistedSession | null {
  const stateRaw = getRawString(SESSION_STORAGE_KEYS.legacyState);
  if (stateRaw === undefined) {
    return null;
  }
  const state = parseLegacyGameState(parseJsonValue(stateRaw));
  if (!state) {
    quarantineRaw(stateRaw, 'legacy saved state is invalid');
    void removeItem(SESSION_STORAGE_KEYS.legacyState);
    void removeItem(SESSION_STORAGE_KEYS.legacyMoveLog);
    void removeItem(SESSION_STORAGE_KEYS.legacyBaseline);
    return null;
  }
  const logRaw = getRawString(SESSION_STORAGE_KEYS.legacyMoveLog);
  const parsedLog = logRaw === undefined
    ? []
    : parseLegacyMoveLog(parseJsonValue(logRaw));
  const moveLog = parsedLog ?? [];
  const baselineRaw = getRawString(SESSION_STORAGE_KEYS.legacyBaseline);
  const replayBaseline = baselineRaw === undefined
    ? null
    : parseLegacyGameState(parseJsonValue(baselineRaw));
  return makePersistedSession({
    state,
    moveLog,
    replayBaseline,
  });
}

export function loadPersistedSession(): PersistedSession | null {
  const pending = readValidated(SESSION_STORAGE_KEYS.pending);
  const main = readValidated(SESSION_STORAGE_KEYS.session);

  if (pending && !main) {
    commitSession(pending.session);
    return pending.session;
  }
  if (main) {
    void removeItem(SESSION_STORAGE_KEYS.pending);
    return main.session;
  }

  const migrated = migrateLegacySession();
  if (!migrated) {
    return null;
  }
  commitSession(migrated);
  return migrated;
}

export function savePersistedSession(parts: {
  state: GameState;
  moveLog: MoveLogEntry[];
  replayBaseline: GameState | null;
}): void {
  commitSession(makePersistedSession(parts));
}

export function clearPersistedSession(): void {
  void removeItem(SESSION_STORAGE_KEYS.session);
  void removeItem(SESSION_STORAGE_KEYS.pending);
  void removeItem(SESSION_STORAGE_KEYS.legacyState);
  void removeItem(SESSION_STORAGE_KEYS.legacyMoveLog);
  void removeItem(SESSION_STORAGE_KEYS.legacyBaseline);
}

export function hasQuarantinedSession(): boolean {
  return getRawString(SESSION_STORAGE_KEYS.quarantine) !== undefined;
}

export function loadQuarantinedSession(): QuarantinedSession | null {
  const raw = getRawString(SESSION_STORAGE_KEYS.quarantine);
  if (raw === undefined) {
    return null;
  }
  const parsed = parseJsonValue(raw);
  if (!parsed || typeof parsed !== 'object') {
    return { error: 'quarantined payload is unreadable', raw, quarantinedAt: 0 };
  }
  const record = parsed as Partial<QuarantinedSession>;
  return {
    error: typeof record.error === 'string' ? record.error : 'saved game is invalid',
    raw: typeof record.raw === 'string' ? record.raw : raw,
    quarantinedAt: typeof record.quarantinedAt === 'number' ? record.quarantinedAt : 0,
  };
}

export function discardQuarantinedSession(): void {
  void removeItem(SESSION_STORAGE_KEYS.quarantine);
}

export function isResumableGame(state: GameState | null | undefined): boolean {
  return state != null && state.phase !== 'game-over';
}

export function isReviewableGame(state: GameState | null | undefined): boolean {
  return state != null && state.phase === 'game-over';
}

export function saveActiveGame(state: GameState): void {
  const existing = loadPersistedSession();
  savePersistedSession({
    state,
    moveLog: existing?.moveLog ?? [],
    replayBaseline: existing?.replayBaseline ?? null,
  });
}

export function loadActiveGame(): GameState | null {
  return loadPersistedSession()?.state ?? null;
}

export function clearActiveGame(): void {
  clearPersistedSession();
}

export function saveReplayBaseline(state: GameState): void {
  const existing = loadPersistedSession();
  if (!existing) {
    return;
  }
  savePersistedSession({
    state: existing.state,
    moveLog: existing.moveLog,
    replayBaseline: state,
  });
}

export function loadReplayBaseline(): GameState | null {
  return loadPersistedSession()?.replayBaseline ?? null;
}

export function clearMoveLogAndBaseline(): void {
  const existing = loadPersistedSession();
  if (!existing) {
    return;
  }
  savePersistedSession({
    state: existing.state,
    moveLog: [],
    replayBaseline: null,
  });
}

export function loadMoveLog(): MoveLogEntry[] {
  return loadPersistedSession()?.moveLog ?? [];
}

export function hasSavedGame(): boolean {
  return isResumableGame(loadActiveGame());
}

export function hasReviewableCompletedGame(liveState?: GameState | null): boolean {
  return isReviewableGame(liveState) || isReviewableGame(loadActiveGame());
}

/** In-progress save from MMKV, or null. Used on cold launch and Resume. */
export function loadRestorableGame(): GameState | null {
  const saved = loadActiveGame();
  return isResumableGame(saved) ? saved : null;
}

/** Valid in-progress or completed session, or null. */
export function loadPersistedGame(): GameState | null {
  return loadActiveGame();
}

/** MMKV save or in-memory state (home may not re-render after back nav). */
export function canContinueSavedGame(liveState: GameState | null | undefined): boolean {
  return isResumableGame(liveState) || hasSavedGame();
}
