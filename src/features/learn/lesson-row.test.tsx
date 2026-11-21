import { LESSONS } from '@/lib/learn/curriculum';
import { cleanup, screen, setup } from '@/lib/test-utils';

import { LessonRow } from './lesson-row';

const mockIsRTL = jest.fn().mockReturnValue(false);
jest.mock('@/lib/i18n', () => ({
  translate: (key: string) => key,
  useLayoutIsRTL: () => mockIsRTL(),
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

  it('marks a finished lesson with a tick and a replay arrow', () => {
    setup(<LessonRow lesson={LESSONS[0]!} completed onPress={jest.fn()} />);
    expect(screen.getByText('check')).toBeTruthy();
    expect(screen.getByText('rotate-ccw')).toBeTruthy();
    expect(screen.queryByText(String(LESSONS[0]!.order))).toBeNull();
  });

  it('points its arrow the way the language reads', () => {
    setup(<LessonRow lesson={LESSONS[1]!} completed={false} next onPress={jest.fn()} />);
    expect(screen.getByText('chevron-right')).toBeTruthy();
  });

  it('points its arrow left in a right-to-left language', () => {
    mockIsRTL.mockReturnValueOnce(true);
    setup(<LessonRow lesson={LESSONS[1]!} completed={false} next onPress={jest.fn()} />);
    expect(screen.getByText('chevron-left')).toBeTruthy();
  });
});
