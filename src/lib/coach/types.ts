import type { Move } from '@/lib/game';

export type CoachIntent
  = | 'welcome'
    | 'explain_position'
    | 'best_move'
    | 'race'
    | 'bar'
    | 'hitting'
    | 'bearing_off'
    | 'dice'
    | 'direction'
    | 'blots'
    | 'tip'
    | 'fallback';

export type CoachSuggestedPrompt = {
  id: Exclude<CoachIntent, 'welcome' | 'bar' | 'blots' | 'fallback'>;
  label: string;
};

export type PositionFacts = {
  phase: string;
  currentPlayer: 'white' | 'black';
  whitePips: number;
  blackPips: number;
  pipLead: 'white' | 'black' | 'tied';
  pipDiff: number;
  whiteBlots: number;
  blackBlots: number;
  whiteBar: number;
  blackBar: number;
  whiteBorneOff: number;
  blackBorneOff: number;
  whiteMadePoints: number;
  blackMadePoints: number;
  dice: [number, number];
  remainingDice: number[];
  legalMoveCount: number;
  uniqueMoveCount: number;
  suggestedMove: Move | null;
  canBearOff: boolean;
  onBar: boolean;
  mustEnter: boolean;
};

export type CoachMessage = {
  id: string;
  role: 'coach' | 'user';
  text: string;
  intent?: CoachIntent;
};
