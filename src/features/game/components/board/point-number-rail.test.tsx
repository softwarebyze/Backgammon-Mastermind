import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { pointNumberLabel, resolveNumberPerspective } from '@/features/game/point-numbering';

import { PointNumberRail } from './point-number-rail';

const DIMENSIONS = {
  boardWidth: 360,
  boardHeight: 400,
  boardFrameWidth: 8,
  boardOuterWidth: 376,
  boardOuterHeight: 416,
  colWidth: 24,
  checkerSize: 22,
  pointHeight: 160,
  barWidth: 24,
  bearOffWidth: 24,
  middleHeight: 40,
} as const;

describe('pointNumberLabel', () => {
  it('labels from white\'s point of view by default', () => {
    expect(pointNumberLabel(1, 'white')).toBe(1);
    expect(pointNumberLabel(24, 'white')).toBe(24);
    expect(pointNumberLabel(13, 'white')).toBe(13);
  });

  it('labels from black\'s point of view: black\'s 1-point is physical 24', () => {
    expect(pointNumberLabel(24, 'black')).toBe(1);
    expect(pointNumberLabel(1, 'black')).toBe(24);
    // Black's home board (physical 19-24) reads 6-1 left to right.
    expect([19, 20, 21, 22, 23, 24].map(n => pointNumberLabel(n, 'black')))
      .toEqual([6, 5, 4, 3, 2, 1]);
    // Black's outer board mirrors too.
    expect([13, 14, 15, 16, 17, 18].map(n => pointNumberLabel(n, 'black')))
      .toEqual([12, 11, 10, 9, 8, 7]);
  });
});

describe('resolveNumberPerspective', () => {
  it('uses the side to move on the live board', () => {
    expect(resolveNumberPerspective({
      isReviewing: false,
      reviewedPlayer: null,
      currentPlayer: 'black',
    })).toBe('black');
    expect(resolveNumberPerspective({
      isReviewing: false,
      reviewedPlayer: null,
      currentPlayer: 'white',
    })).toBe('white');
  });

  it('uses the reviewed turn\'s player when reviewing', () => {
    expect(resolveNumberPerspective({
      isReviewing: true,
      reviewedPlayer: 'black',
      currentPlayer: 'white',
    })).toBe('black');
  });

  it('falls back to the side to move when no turn is focused', () => {
    expect(resolveNumberPerspective({
      isReviewing: true,
      reviewedPlayer: null,
      currentPlayer: 'black',
    })).toBe('black');
  });
});

describe('pointNumberRail', () => {
  function renderedLabels(side: 'top' | 'bottom', perspective: 'white' | 'black'): string[] {
    const { UNSAFE_queryAllByType } = render(
      <PointNumberRail side={side} dimensions={{ ...DIMENSIONS }} perspective={perspective} />,
    );
    return UNSAFE_queryAllByType(Text)
      .map(node => node.props.children)
      .filter((child): child is number => typeof child === 'number')
      .map(String);
  }

  it('renders white-oriented numbers by default', () => {
    expect(renderedLabels('top', 'white')).toEqual(
      ['13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24'],
    );
    expect(renderedLabels('bottom', 'white')).toEqual(
      ['12', '11', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1'],
    );
  });

  it('renders black-oriented numbers from black\'s point of view', () => {
    // Black's home board (physical 19-24, top right) reads 6-1; black's
    // ace-point (physical 24) is labeled 1.
    expect(renderedLabels('top', 'black')).toEqual(
      ['12', '11', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1'],
    );
    expect(renderedLabels('bottom', 'black')).toEqual(
      ['13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24'],
    );
  });
});
