import type { GamePreferences } from '@/lib/game-preferences/types';

import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { AutoMoveIcon } from '@/features/game/components/settings-ui/auto-move-icon';
import { AutoRollIcon } from '@/features/game/components/settings-ui/auto-roll-icon';
import { ConfirmMoveIcon } from '@/features/game/components/settings-ui/confirm-move-icon';
import { DiceStylePicker } from '@/features/game/components/settings-ui/dice-style-picker';
import { HorseshoeIcon } from '@/features/game/components/settings-ui/horseshoe-icon';
import { MoveHintIcon } from '@/features/game/components/settings-ui/move-hint-icon';
import { PointNumbersIcon } from '@/features/game/components/settings-ui/point-numbers-icon';
import { SettingToggleRow } from '@/features/game/components/settings-ui/setting-toggle-row';
import { SoundIcon } from '@/features/game/components/settings-ui/sound-icon';
import { TutorIcon } from '@/features/game/components/settings-ui/tutor-icon';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { continuousRadius } from '@/lib/ui/native-styles';
import { SETTINGS_ROW_PADDING_H } from '@/lib/ui/settings-layout';

type GamePreferenceRowId
  = | 'showMoveHints'
    | 'showDirectionOverlay'
    | 'showPointNumbers'
    | 'tutorMode'
    | 'autoRoll'
    | 'autoMoveWhenForced'
    | 'confirmMove'
    | 'soundEnabled'
    | 'diceDisplay';

type PreferenceHandlers = {
  onShowMoveHintsChange: (value: boolean) => void;
  onShowDirectionOverlayChange: (value: boolean) => void;
  onShowPointNumbersChange: (value: boolean) => void;
  onDiceDisplayStyleChange: (style: GamePreferences['diceDisplayStyle']) => void;
  onAutoRollChange: (value: boolean) => void;
  onAutoMoveWhenForcedChange: (value: boolean) => void;
  onSoundEnabledChange: (value: boolean) => void;
  onTutorModeChange: (value: boolean) => void;
  onConfirmMoveChange: (value: boolean) => void;
};

type Props = {
  preferences: GamePreferences;
  showHints?: boolean;
  isVisible?: (id: GamePreferenceRowId) => boolean;
} & PreferenceHandlers;

type Row = {
  id: GamePreferenceRowId;
  node: React.ReactNode;
};

type CardProps = {
  preferences: GamePreferences;
  handlers: PreferenceHandlers;
  showHints: boolean;
  isVisible: (id: GamePreferenceRowId) => boolean;
};

function renderRows(rows: Row[]) {
  return rows.map((row, index) => (
    <React.Fragment key={row.id}>
      {index > 0 ? <View style={styles.divider} /> : null}
      {row.node}
    </React.Fragment>
  ));
}

function BoardPreferenceCard({ preferences, handlers, showHints, isVisible }: CardProps) {
  const allRows: Row[] = [
    {
      id: 'showMoveHints',
      node: (
        <SettingToggleRow
          icon={<MoveHintIcon size={32} active={preferences.showMoveHints} />}
          label={translate('game.preferences.move_hints')}
          hint={showHints ? translate('game.preferences.move_hints_hint') : undefined}
          value={preferences.showMoveHints}
          onChange={handlers.onShowMoveHintsChange}
          testID="setting-toggle-move-hints"
        />
      ),
    },
    {
      id: 'showDirectionOverlay',
      node: (
        <SettingToggleRow
          icon={<HorseshoeIcon size={32} active={preferences.showDirectionOverlay} />}
          label={translate('game.preferences.direction_overlay')}
          hint={showHints ? translate('game.preferences.direction_overlay_hint') : undefined}
          value={preferences.showDirectionOverlay}
          onChange={handlers.onShowDirectionOverlayChange}
          testID="setting-toggle-direction-overlay"
        />
      ),
    },
    {
      id: 'showPointNumbers',
      node: (
        <SettingToggleRow
          icon={<PointNumbersIcon size={32} active={preferences.showPointNumbers} />}
          label={translate('game.preferences.point_numbers')}
          hint={showHints ? translate('game.preferences.point_numbers_hint') : undefined}
          value={preferences.showPointNumbers}
          onChange={handlers.onShowPointNumbersChange}
          testID="setting-toggle-point-numbers"
        />
      ),
    },
    {
      id: 'tutorMode',
      node: (
        <SettingToggleRow
          icon={<TutorIcon size={32} active={preferences.tutorMode} />}
          label={translate('game.preferences.tutor_mode')}
          hint={showHints ? translate('game.preferences.tutor_mode_hint') : undefined}
          value={preferences.tutorMode}
          onChange={handlers.onTutorModeChange}
          testID="setting-toggle-tutor-mode"
        />
      ),
    },
  ];
  const rows = allRows.filter(row => isVisible(row.id));

  if (rows.length === 0) {
    return null;
  }

  return <View style={styles.card}>{renderRows(rows)}</View>;
}

function AutomationPreferenceCard({ preferences, handlers, showHints, isVisible }: CardProps) {
  const allRows: Row[] = [
    {
      id: 'autoRoll',
      node: (
        <SettingToggleRow
          icon={<AutoRollIcon size={42} active={preferences.autoRoll} />}
          label={translate('game.preferences.auto_roll')}
          hint={showHints ? translate('game.preferences.auto_roll_hint') : undefined}
          value={preferences.autoRoll}
          onChange={handlers.onAutoRollChange}
          testID="setting-toggle-auto-roll"
        />
      ),
    },
    {
      id: 'autoMoveWhenForced',
      node: (
        <SettingToggleRow
          icon={<AutoMoveIcon size={42} active={preferences.autoMoveWhenForced} />}
          label={translate('game.preferences.auto_move')}
          hint={showHints ? translate('game.preferences.auto_move_hint') : undefined}
          value={preferences.autoMoveWhenForced}
          onChange={handlers.onAutoMoveWhenForcedChange}
          testID="setting-toggle-auto-move"
        />
      ),
    },
    {
      id: 'confirmMove',
      node: (
        <SettingToggleRow
          icon={<ConfirmMoveIcon size={32} active={preferences.confirmMove} />}
          label={translate('game.preferences.confirm_move')}
          hint={showHints ? translate('game.preferences.confirm_move_hint') : undefined}
          value={preferences.confirmMove}
          onChange={handlers.onConfirmMoveChange}
          testID="setting-toggle-confirm-move"
        />
      ),
    },
    {
      id: 'soundEnabled',
      node: (
        <SettingToggleRow
          icon={<SoundIcon size={32} active={preferences.soundEnabled} />}
          label={translate('game.preferences.sound')}
          hint={showHints ? translate('game.preferences.sound_hint') : undefined}
          value={preferences.soundEnabled}
          onChange={handlers.onSoundEnabledChange}
          testID="setting-toggle-sound"
        />
      ),
    },
  ];
  const rows = allRows.filter(row => isVisible(row.id));

  if (rows.length === 0) {
    return null;
  }

  return <View style={styles.card}>{renderRows(rows)}</View>;
}

function DicePreferenceCard({ preferences, handlers }: Pick<CardProps, 'preferences' | 'handlers'>) {
  return (
    <View style={styles.diceCard}>
      <DiceStylePicker
        value={preferences.diceDisplayStyle}
        onChange={handlers.onDiceDisplayStyleChange}
      />
    </View>
  );
}

export function GamePreferencesPanel({
  preferences,
  showHints = false,
  isVisible,
  ...handlers
}: Props) {
  const show = isVisible ?? (() => true);
  const cardProps = { preferences, handlers, showHints, isVisible: show };

  return (
    <View style={styles.wrap}>
      <BoardPreferenceCard {...cardProps} />
      <AutomationPreferenceCard {...cardProps} />
      {show('diceDisplay') ? <DicePreferenceCard preferences={preferences} handlers={handlers} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  card: {
    backgroundColor: GAME_PALETTE.bg,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    paddingVertical: 4,
    overflow: 'hidden',
    ...continuousRadius(12),
  },
  diceCard: {
    backgroundColor: GAME_PALETTE.bg,
    paddingHorizontal: SETTINGS_ROW_PADDING_H,
    paddingVertical: SETTINGS_ROW_PADDING_H,
    ...continuousRadius(12),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: GAME_PALETTE.surfaceBorder,
  },
});
