/* eslint-disable react-refresh/only-export-components */
/**
 * Modal
 * Dependencies:
 * - @gorhom/bottom-sheet.
 *
 * Props:
 * - All `BottomSheetModalProps` props.
 * - `title` (string | undefined): Optional title for the modal header.
 *
 * Usage Example:
 * import { Modal, useModal } from '@gorhom/bottom-sheet';
 *
 * function DisplayModal() {
 *   const { ref, present, dismiss } = useModal();
 *
 *   return (
 *     <View>
 *       <Modal
 *         snapPoints={['60%']} // optional
 *         title="Modal Title"
 *         ref={ref}
 *       >
 *         Modal Content
 *       </Modal>
 *     </View>
 *   );
 * }
 *
 */

import type {
  BottomSheetBackdropProps,
  BottomSheetModalProps,
} from '@gorhom/bottom-sheet';
import { BottomSheetModal, useBottomSheet } from '@gorhom/bottom-sheet';
import * as React from 'react';
import { Platform, Pressable, Text as RNText, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Path, Svg } from 'react-native-svg';

import { interFont } from '@/lib/ui/fonts';

import { Text } from './text';

type ModalProps = BottomSheetModalProps & {
  title?: string;
  /** Game screen palette — readable title/handle on dark brown sheets */
  headerTheme?: 'default' | 'game';
  /** Put title in sheet body (not handle) — required for native dynamic sizing */
  titleInContent?: boolean;
};

type ModalRef = React.ForwardedRef<BottomSheetModal>;

type ModalHeaderProps = {
  title?: string;
  dismiss: () => void;
};

export function useModal() {
  const ref = React.useRef<BottomSheetModal>(null);
  const present = React.useCallback((data?: any) => {
    ref.current?.present(data);
  }, []);
  const dismiss = React.useCallback(() => {
    ref.current?.dismiss();
  }, []);
  return { ref, present, dismiss };
}

export function Modal({
  ref,
  snapPoints: _snapPoints = ['60%'] as (string | number)[],
  title,
  headerTheme = 'default',
  titleInContent = false,
  detached = false,
  enableDynamicSizing = false,
  handleIndicatorStyle,
  ...props
}: ModalProps & { ref?: ModalRef; enableDynamicSizing?: boolean }) {
  const detachedProps = React.useMemo(
    () => getDetachedProps(detached),
    [detached],
  );
  const modal = useModal();
  const snapPoints = React.useMemo(
    () => (enableDynamicSizing ? undefined : _snapPoints),
    [_snapPoints, enableDynamicSizing],
  );

  React.useImperativeHandle(
    ref,
    () => (modal.ref.current as BottomSheetModal) || null,
  );

  const handleTitle = titleInContent ? undefined : title;

  const renderHandleComponent = React.useCallback(
    () => (
      <>
        {headerTheme === 'game'
          ? (
              <View style={gameHandleStyles.chrome}>
                <View style={gameHandleStyles.handleWrap}>
                  <View style={[gameHandleStyles.indicator, handleIndicatorStyle]} />
                </View>
                {handleTitle
                  ? (
                      <ModalHeader title={handleTitle} dismiss={modal.dismiss} theme={headerTheme} />
                    )
                  : null}
              </View>
            )
          : (
              <>
                <View className="mt-2 mb-8 h-1 w-12 self-center rounded-lg bg-gray-400 dark:bg-gray-700" />
                <ModalHeader title={handleTitle} dismiss={modal.dismiss} theme={headerTheme} />
              </>
            )}
      </>
    ),
    [handleTitle, modal.dismiss, headerTheme, handleIndicatorStyle],
  );

  return (
    <BottomSheetModal
      {...props}
      {...detachedProps}
      ref={modal.ref}
      index={0}
      snapPoints={snapPoints}
      backdropComponent={props.backdropComponent || renderBackdrop}
      enableDynamicSizing={enableDynamicSizing}
      handleComponent={renderHandleComponent}
    />
  );
}

/**
 * Custom Backdrop
 */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function CustomBackdrop({ style }: BottomSheetBackdropProps) {
  const { close } = useBottomSheet();
  return (
    <AnimatedPressable
      onPress={() => close()}
      entering={FadeIn.duration(50)}
      exiting={FadeOut.duration(20)}
      style={[style, { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]}
    />
  );
}

export function renderBackdrop(props: BottomSheetBackdropProps) {
  return <CustomBackdrop {...props} />;
}

/**
 *
 * @param detached
 * @returns
 *
 * @description
 * In case the modal is detached, we need to add some extra props to the modal to make it look like a detached modal.
 */

function getDetachedProps(detached: boolean) {
  if (detached) {
    return {
      detached: true,
      bottomInset: 46,
      style: { marginHorizontal: 16, overflow: 'hidden' },
    } as Partial<BottomSheetModalProps>;
  }
  return {} as Partial<BottomSheetModalProps>;
}

/**
 * ModalHeader
 */

type ModalHeaderPropsWithTheme = ModalHeaderProps & { theme?: 'default' | 'game' };

const HEADER_SIDE = 40;

const ModalHeader = React.memo(({ title, dismiss, theme = 'default' }: ModalHeaderPropsWithTheme) => {
  if (!title) {
    return <CloseButton close={dismiss} theme={theme} />;
  }

  if (theme === 'game') {
    return (
      <View style={gameHandleStyles.headerRow}>
        <View style={gameHandleStyles.headerSide} />
        <RNText style={gameHandleStyles.title} numberOfLines={1}>
          {title}
        </RNText>
        <Pressable
          onPress={dismiss}
          style={gameHandleStyles.headerSide}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <CloseIcon fill="#A08060" />
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <View className="flex-row px-2 py-4">
        <View className="size-6" />
        <View className="flex-1">
          <Text className="text-center text-[16px] font-bold text-[#26313D] dark:text-white">
            {title}
          </Text>
        </View>
      </View>
      <CloseButton close={dismiss} theme={theme} />
    </>
  );
});

/** iOS sheet grabber + Material bottom-sheet header rhythm */
const SHEET_TOP = Platform.select({ ios: 12, android: 16, default: 14 });
const HANDLE_TO_TITLE = Platform.select({ ios: 12, android: 14, default: 12 });

const gameHandleStyles = StyleSheet.create({
  chrome: {
    paddingTop: SHEET_TOP,
  },
  handleWrap: {
    alignItems: 'center',
    paddingBottom: HANDLE_TO_TITLE,
  },
  indicator: {
    height: 5,
    width: 36,
    borderRadius: 2.5,
    backgroundColor: '#8B5E3C',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  headerSide: {
    width: HEADER_SIDE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: Platform.select({ ios: 17, android: 18, default: 17 }),
    color: '#F2EAD3',
    ...interFont(Platform.OS === 'android' ? 'bold' : 'semibold'),
  },
});

function CloseIcon({ fill = '#9CA3AF' }: { fill?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path
        fill={fill}
        d="M18.707 6.707a1 1 0 0 0-1.414-1.414L12 10.586 6.707 5.293a1 1 0 0 0-1.414 1.414L10.586 12l-5.293 5.293a1 1 0 1 0 1.414 1.414L12 13.414l5.293 5.293a1 1 0 0 0 1.414-1.414L13.414 12l5.293-5.293Z"
      />
    </Svg>
  );
}

function CloseButton({ close, theme = 'default' }: { close: () => void; theme?: 'default' | 'game' }) {
  if (theme === 'game') {
    return null;
  }

  return (
    <Pressable
      onPress={close}
      className="absolute top-3 right-3 size-6 items-center justify-center"
      hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      accessibilityLabel="close modal"
      accessibilityRole="button"
      accessibilityHint="closes the modal"
    >
      <CloseIcon />
    </Pressable>
  );
}
