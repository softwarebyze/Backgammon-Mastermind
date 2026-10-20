import { LESSONS } from '@/lib/learn/curriculum';
import { cleanup, screen, setup } from '@/lib/test-utils';

import { LessonRow } from './lesson-row';

jest.mock('@/lib/i18n', () => ({
  translate: (key: string, options?: Record<string, unknown>) =>
    options ? `${key}:${JSON.stringify(options)}` : key,
}));

jest.mock('@expo/vector-icons/Feather', () => {
  const React = require('react');
  const { Text } = require('react-native');
  function FeatherMock(props: { name: string }) {
    return React.createElement(Text, null, props.name);
  }
  return { __esModule: true, default: FeatherMock };
});

afterEach(cleanup);

describe('lessonRow', () => {
  it('stays pressable when the lesson is completed', async () => {
    const onPress = jest.fn();
    const { user } = setup(
      <LessonRow
        lesson={LESSONS[0]!}
        completed
        unlocked
        onPress={onPress}
      />,
    );
    const row = screen.getByRole('button');
    expect(row.props.accessibilityState.disabled).toBeFalsy();
    await user.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows the lesson subtitle and names the lock state when locked', () => {
    setup(<LessonRow lesson={LESSONS[3]!} completed={false} unlocked={false} onPress={jest.fn()} />);

    const row = screen.getByRole('button');
    expect(row.props.accessibilityState.disabled).toBe(true);
    expect(row.props.accessibilityHint).toBe('learn.locked');
    expect(screen.getByText(LESSONS[3]!.subtitleKey)).toBeTruthy();
    expect(screen.queryByText('learn.start')).toBeNull();
  });

  it('offers Replay instead of Start once completed', () => {
    setup(<LessonRow lesson={LESSONS[0]!} completed unlocked onPress={jest.fn()} />);

    expect(screen.getByText('learn.replay')).toBeTruthy();
    expect(screen.queryByText('learn.start')).toBeNull();
  });
});
