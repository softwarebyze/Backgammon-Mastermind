import { LESSONS } from '@/lib/learn/curriculum';
import { cleanup, screen, setup } from '@/lib/test-utils';

import { LessonRow } from './lesson-row';

jest.mock('@/lib/i18n', () => ({
  translate: (key: string) => key,
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
        onPress={onPress}
      />,
    );
    const row = screen.getByRole('button');
    expect(row.props.accessibilityState.disabled).toBeFalsy();
    await user.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('opens a later lesson that has not been started, showing it as not done', async () => {
    const onPress = jest.fn();
    const last = LESSONS[LESSONS.length - 1]!;
    const { user } = setup(<LessonRow lesson={last} completed={false} onPress={onPress} />);
    const row = screen.getByRole('button');
    expect(row.props.accessibilityState?.disabled).toBeFalsy();
    expect(screen.getByText(last.subtitleKey)).toBeTruthy();
    expect(screen.getByText(String(last.order))).toBeTruthy();
    expect(screen.queryByText('check')).toBeNull();
    await user.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
