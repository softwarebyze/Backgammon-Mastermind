import type { Player } from '@/lib/game/types';
import type { Position } from '@/lib/positions/position';
import { PlayerStrip } from '@/features/game/components/player-strip';
import { translate } from '@/lib/i18n';
import { newPosition, positionGame } from '@/lib/positions/position';

/**
 * The same player strip a game shows, above (Black) or below (White) the
 * board. Tapping it puts that player on roll.
 */
export function PositionPlayerStrip({ position, player, onChange }: {
  position: Position;
  player: Player;
  onChange: (p: Position) => void;
}) {
  const c = position.context;
  const state = { ...positionGame({ ...position, dice: [0, 0], context: newPosition().context }), currentPlayer: position.currentPlayer };
  const putOnRoll = () => onChange({ ...position, currentPlayer: player, context: { ...c, turnOwner: player, doubleAction: '', resignation: 0 } });
  return (
    <PlayerStrip
      state={state}
      player={player}
      headlineOverride={translate('positions.on_roll')}
      hideStrategy
      onPress={position.currentPlayer === player ? undefined : putOnRoll}
      pressHint={translate('positions.on_roll_hint')}
    />
  );
}
