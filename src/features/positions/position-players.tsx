import type { Player } from '@/lib/game/types';
import type { Position } from '@/lib/positions/position';
import { PlayerStrip } from '@/features/game/components/player-strip';
import { translate } from '@/lib/i18n';
import { newPosition, positionGame } from '@/lib/positions/position';

/**
 * The same player strip a game shows, above (Black) or below (White) the
 * board. Tapping it puts that player on roll; the other strip says so.
 */
export function PositionPlayerStrip({ position, player, onChange }: {
  position: Position;
  player: Player;
  onChange: (p: Position) => void;
}) {
  const c = position.context;
  const pending = c.doubleAction === 'D' || c.doubleAction === 'B';
  const state = { ...positionGame({ ...position, dice: [0, 0], context: newPosition().context }), currentPlayer: pending ? c.turnOwner : position.currentPlayer };
  if (pending) {
    state.match = {
      ...state.match!,
      cube: { value: 2 ** c.cubeExponent, owner: c.cubeOwner ?? 'center' },
      pendingOffer: position.currentPlayer === 'white' ? 'black' : 'white',
      ...(c.doubleAction === 'B' ? { pendingBeaver: true } : {}),
    };
  }
  const putOnRoll = () => onChange({ ...position, currentPlayer: player, context: { ...c, turnOwner: player, doubleAction: '', resignation: 0 } });
  return (
    <PlayerStrip
      state={state}
      player={player}
      headlineOverride={translate('positions.on_roll')}
      hideStrategy
      onPress={!c.doubleAction && !c.resignation && position.currentPlayer === player ? undefined : putOnRoll}
      pressHint={translate('positions.on_roll_hint')}
      idleStatus={translate('positions.tap_on_roll')}
    />
  );
}
