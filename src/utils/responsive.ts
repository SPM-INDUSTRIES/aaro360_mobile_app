import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

const horizontalScale = SCREEN_WIDTH / BASE_WIDTH;
const verticalScale = SCREEN_HEIGHT / BASE_HEIGHT;

const moderateScale = (size: number, factor: number = 0.5) =>
  size + (horizontalScale * size - size) * factor;

export const wp = (percentage: number): number =>
  (SCREEN_WIDTH * percentage) / 100;

export const hp = (percentage: number): number =>
  (SCREEN_HEIGHT * percentage) / 100;

export const rw = (size: number): number =>
  Math.round(PixelRatio.roundToNearestPixel(size * horizontalScale));

export const rh = (size: number): number =>
  Math.round(PixelRatio.roundToNearestPixel(size * verticalScale));

export const rf = (size: number, factor: number = 0.5): number =>
  Math.round(PixelRatio.roundToNearestPixel(moderateScale(size, factor)));

export const rs = (size: number): number => rw(size);

export const minTouchTarget = Platform.OS === 'ios' ? 44 : 48;

export const screen = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isSmall: SCREEN_WIDTH < 360,
  isMedium: SCREEN_WIDTH >= 360 && SCREEN_WIDTH < 414,
  isLarge: SCREEN_WIDTH >= 414,
  isTablet: SCREEN_WIDTH >= 768,
};

export const responsiveWidth = {
  cardSmall: () => rw(85),
  cardMedium: () => wp(90) - rs(20),
  cardLarge: () => wp(85),
  offerCard: () => wp(88),
  categoryCard: () => (SCREEN_WIDTH - rs(55)) / 2,
  otpBox: () => Math.max(48, (SCREEN_WIDTH - 48 - 40) / 6),
};

export const responsiveHeight = {
  tabBar: () => SCREEN_HEIGHT > 700 ? 65 : SCREEN_HEIGHT > 600 ? 55 : 50,
  headerImage: () => hp(25),
  cardImage: () => hp(20),
  offerImage: () => hp(18),
};

export const responsiveFontSize = {
  xs: () => rf(12),
  sm: () => rf(14),
  md: () => rf(16),
  lg: () => rf(18),
  xl: () => rf(20),
  xxl: () => rf(24),
  xxxl: () => rf(28),
  display: () => rf(32),
};

export const responsiveSpacing = {
  xs: () => rs(4),
  sm: () => rs(8),
  md: () => rs(12),
  lg: () => rs(16),
  xl: () => rs(20),
  xxl: () => rs(24),
  xxxl: () => rs(32),
};

export const touchTarget = {
  small: () => Math.max(minTouchTarget * 0.8, 36),
  medium: () => minTouchTarget,
  large: () => minTouchTarget * 1.2,
};

export const responsiveImage = {
  avatar: {
    small: () => rw(32),
    medium: () => rw(40),
    large: () => rw(50),
    xlarge: () => rw(80),
  },
  thumbnail: {
    small: () => rw(60),
    medium: () => rw(80),
    large: () => rw(100),
    xlarge: () => rw(120),
  },
  card: {
    small: () => rw(65),
    medium: () => rw(85),
    large: () => rw(100),
  },
};

export default {
  wp,
  hp,
  rw,
  rh,
  rf,
  rs,
  minTouchTarget,
  screen,
  responsiveWidth,
  responsiveHeight,
  responsiveFontSize,
  responsiveSpacing,
  touchTarget,
  responsiveImage,
};
