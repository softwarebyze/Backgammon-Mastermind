import * as React from 'react';

import { cleanup, render, screen, setup } from '@/lib/test-utils';

import { PostHogErrorFallback } from './posthog-error-fallback';

afterEach(cleanup);

describe('posthog error fallback', () => {
  it('renders the crash copy', () => {
    render(<PostHogErrorFallback error={new Error('boom')} />);
    expect(screen.getByTestId('posthog-error-fallback')).toBeOnTheScreen();
    expect(screen.getByText('Something went wrong')).toBeOnTheScreen();
  });

  it('calls onRetry from the Retry button', async () => {
    const onRetry = jest.fn();
    const { user } = setup(
      <PostHogErrorFallback error={new Error('boom')} onRetry={onRetry} />,
    );
    await user.press(screen.getByTestId('posthog-error-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
