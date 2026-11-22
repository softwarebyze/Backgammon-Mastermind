import {
  bindWebAttribution,
  DIRECT,
  getWebAttribution,
  resetWebAttributionForTests,
  trackWebPageview,
} from './web-attribution';

const capture = jest.fn();
const register = jest.fn(() => undefined);

beforeEach(() => {
  capture.mockClear();
  register.mockClear();
  resetWebAttributionForTests();
});

describe('getWebAttribution', () => {
  it('splits the referrer into URL and hostname', () => {
    const { properties, setOnce } = getWebAttribution({
      href: 'https://play.example.com/',
      referrer: 'https://www.reddit.com/r/backgammon/comments/abc',
    });
    expect(properties).toEqual({
      $referrer: 'https://www.reddit.com/r/backgammon/comments/abc',
      $referring_domain: 'www.reddit.com',
    });
    expect(setOnce).toEqual({
      $initial_referrer: 'https://www.reddit.com/r/backgammon/comments/abc',
      $initial_referring_domain: 'www.reddit.com',
    });
  });

  it('reports an empty or malformed referrer as $direct', () => {
    expect(getWebAttribution({ href: 'https://a.test/', referrer: '' }).properties)
      .toEqual({ $referrer: DIRECT, $referring_domain: DIRECT });
    expect(getWebAttribution({ href: 'https://a.test/', referrer: 'not a url' }).properties.$referring_domain)
      .toBe(DIRECT);
  });

  it('captures UTM params and ignores other query params', () => {
    const { properties, setOnce } = getWebAttribution({
      href: 'https://a.test/?utm_source=discord&utm_campaign=launch&utm_medium=%20&gameId=42',
      referrer: '',
    });
    expect(properties).toEqual({
      $referrer: DIRECT,
      $referring_domain: DIRECT,
      utm_source: 'discord',
      utm_campaign: 'launch',
    });
    expect(setOnce.$initial_utm_source).toBe('discord');
    expect(setOnce.$initial_utm_campaign).toBe('launch');
    expect(setOnce).not.toHaveProperty('$initial_utm_medium');
    expect(properties).not.toHaveProperty('gameId');
  });

  it('caps long values', () => {
    const { properties } = getWebAttribution({
      href: `https://a.test/?utm_source=${'x'.repeat(500)}`,
      referrer: `https://b.test/${'y'.repeat(500)}`,
    });
    expect(properties.utm_source).toHaveLength(200);
    expect(properties.$referrer).toHaveLength(200);
  });
});

describe('web pageviews', () => {
  it('does nothing until bound', () => {
    trackWebPageview('/', { href: 'https://a.test/', origin: 'https://a.test', pathname: '/' });
    expect(capture).not.toHaveBeenCalled();
  });

  it('registers attribution and sends $set_once on the first pageview only', () => {
    bindWebAttribution(
      { capture, register },
      { href: 'https://a.test/?utm_source=x', referrer: 'https://news.ycombinator.com/' },
    );
    expect(register).toHaveBeenCalledWith({
      $referrer: 'https://news.ycombinator.com/',
      $referring_domain: 'news.ycombinator.com',
      utm_source: 'x',
    });

    const landing = { href: 'https://a.test/?utm_source=x', origin: 'https://a.test', pathname: '/' };
    trackWebPageview('/', landing);
    // The router has moved on but the browser URL has not caught up yet.
    trackWebPageview('/game', landing);

    expect(capture).toHaveBeenNthCalledWith(1, '$pageview', {
      $current_url: 'https://a.test/?utm_source=x',
      $pathname: '/',
      $set_once: {
        $initial_referrer: 'https://news.ycombinator.com/',
        $initial_referring_domain: 'news.ycombinator.com',
        $initial_utm_source: 'x',
      },
    });
    expect(capture).toHaveBeenNthCalledWith(2, '$pageview', {
      $current_url: 'https://a.test/game',
      $pathname: '/game',
    });
  });
});
