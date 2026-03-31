import React, { ReactNode, useMemo } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector, Directions } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

interface SwipeGestureViewProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export default function SwipeGestureView({
  children,
  style,
  disabled = false,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
}: SwipeGestureViewProps) {
  const gesture = useMemo(() => {
    const gestures = [] as any[];
    const nativeGesture = Gesture.Native();

    if (!disabled && onSwipeLeft) {
      gestures.push(
        Gesture.Fling()
          .direction(Directions.LEFT)
          .numberOfPointers(1)
          .cancelsTouchesInView(false)
          .shouldCancelWhenOutside(false)
          .onStart(() => runOnJS(onSwipeLeft)())
      );
    }

    if (!disabled && onSwipeRight) {
      gestures.push(
        Gesture.Fling()
          .direction(Directions.RIGHT)
          .numberOfPointers(1)
          .cancelsTouchesInView(false)
          .shouldCancelWhenOutside(false)
          .onStart(() => runOnJS(onSwipeRight)())
      );
    }

    if (!disabled && onSwipeUp) {
      gestures.push(
        Gesture.Fling()
          .direction(Directions.UP)
          .numberOfPointers(1)
          .cancelsTouchesInView(false)
          .shouldCancelWhenOutside(false)
          .onStart(() => runOnJS(onSwipeUp)())
      );
    }

    if (!disabled && onSwipeDown) {
      gestures.push(
        Gesture.Fling()
          .direction(Directions.DOWN)
          .numberOfPointers(1)
          .cancelsTouchesInView(false)
          .shouldCancelWhenOutside(false)
          .onStart(() => runOnJS(onSwipeDown)())
      );
    }

    if (gestures.length > 0) {
      return Gesture.Simultaneous(nativeGesture, ...gestures);
    }

    return Gesture.Pan().enabled(false);
  }, [
    disabled,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
  ]);

  return (
    <GestureDetector gesture={gesture}>
      <View style={style}>{children}</View>
    </GestureDetector>
  );
}
