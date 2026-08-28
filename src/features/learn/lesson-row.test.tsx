import { LESSONS } from '@/lib/learn/curriculum';
import { cleanup, screen, setup } from '@/lib/test-utils';

import { LessonRow } from './lesson-row';

jest.mock('@/lib/i18n', () => ({
  translate: (key: string) => key,
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  function FeatherMock(props: { name: string }) {
    return React.createElement(Text, null, props.name);
  }
  return { Feather: FeatherMock };
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
});
