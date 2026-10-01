import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';

import { BLUNDER_BANDS, BLUNDER_METER_MAX } from '../blunder-bands';

import { BlunderMeter } from './blunder-meter';

describe('blunder meter', () => {
  it('uses the standard GNU Backgammon bands', () => {
    expect(BLUNDER_BANDS.map(band => band.max)).toEqual([0.04, 0.08, 0.16, BLUNDER_METER_MAX]);
    expect(BLUNDER_BANDS.map(band => band.label)).toEqual([
      'Fine',
      'Slip',
      'Mistake',
      'Big blunder',
    ]);
  });

  it('positions the needle proportionally to the loss', () => {
    render(<BlunderMeter loss={0.15} />);
    const needle = screen.getByTestId('guidance-blunder-needle');
    const style = StyleSheet.flatten(needle.props.style);
    expect(style.left).toBe('50%');
  });

  it('clamps huge losses to the end of the bar', () => {
    render(<BlunderMeter loss={1.5} />);
    const needle = screen.getByTestId('guidance-blunder-needle');
    const style = StyleSheet.flatten(needle.props.style);
    expect(style.left).toBe('100%');
  });

  it('names the severity in the accessibility label', () => {
    render(<BlunderMeter loss={0.22} />);
    const meter = screen.getByTestId('guidance-blunder-meter');
    expect(meter.props.accessibilityLabel).toMatch(/Blunder severity: Big blunder/);
  });

  it('keeps the final band highlighted past the end of the bar', () => {
    render(<BlunderMeter loss={1.5} />);
    const labels = screen.getAllByText(/^(Fine|Slip|Mistake|Big blunder)$/);
    const active = labels.filter(
      label => StyleSheet.flatten(label.props.style).color === GAME_PALETTE.text,
    );
    expect(active.map(label => label.props.children)).toEqual(['Big blunder']);
  });

  it('matches the accessibility severity to the highlighted band below 0.04', () => {
    render(<BlunderMeter loss={0.02} />);
    const meter = screen.getByTestId('guidance-blunder-meter');
    expect(meter.props.accessibilityLabel).toMatch(/Blunder severity: Fine/);
  });

  it('cites the GNU Backgammon source in the caption', () => {
    render(<BlunderMeter loss={0.1} />);
    expect(screen.getByText(/GNU Backgammon/)).toBeTruthy();
  });
});
