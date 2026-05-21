import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BOARD_PADDING = 4;
export const BAR_WIDTH = 28;
export const BEAR_OFF_WIDTH = 38;
export const MIDDLE_HEIGHT = 12;

export const BOARD_WIDTH = SCREEN_WIDTH - BOARD_PADDING * 2;
export const COL_WIDTH = (BOARD_WIDTH - BAR_WIDTH - BEAR_OFF_WIDTH) / 12;
export const CHECKER_SIZE = Math.min(COL_WIDTH - 4, 26);
export const POINT_HEIGHT = 138;
export const BOARD_HEIGHT = POINT_HEIGHT * 2 + MIDDLE_HEIGHT;
