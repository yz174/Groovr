import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  LayoutChangeEvent,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useTheme } from '../hooks/useTheme';

interface ProgressSliderProps {
  value: number;        // current position (ms)
  maximumValue: number; // total duration (ms)
  onValueChange?: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
}

export default function ProgressSlider({
  value,
  maximumValue,
  onValueChange,
  onSlidingComplete,
}: ProgressSliderProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  const trackPageXRef = useRef(0);

  const displayValue = dragging ? dragValue : value;
  const progress = maximumValue > 0 ? Math.min(displayValue / maximumValue, 1) : 0;

  const getValueFromLocalX = useCallback((x: number) => {
    if (width <= 0 || maximumValue <= 0) return 0;
    const clamped = Math.max(0, Math.min(x, width));
    return (clamped / width) * maximumValue;
  }, [width, maximumValue]);

  const getValueFromPageX = useCallback((pageX: number) => {
    return getValueFromLocalX(pageX - trackPageXRef.current);
  }, [getValueFromLocalX]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e: GestureResponderEvent) => {
      const nextTrackPageX = e.nativeEvent.pageX - e.nativeEvent.locationX;
      trackPageXRef.current = nextTrackPageX;
      setDragging(true);
      const v = getValueFromLocalX(e.nativeEvent.pageX - nextTrackPageX);
      setDragValue(v);
      onValueChange?.(v);
    },
    onPanResponderMove: (e: GestureResponderEvent) => {
      const v = getValueFromPageX(e.nativeEvent.pageX);
      setDragValue(v);
      onValueChange?.(v);
    },
    onPanResponderRelease: (e: GestureResponderEvent) => {
      const v = getValueFromPageX(e.nativeEvent.pageX);
      setDragging(false);
      setDragValue(v);
      onSlidingComplete?.(v);
    },
    onPanResponderTerminate: () => {
      setDragging(false);
    },
  });

  return (
    <View
      style={styles.container}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      {...panResponder.panHandlers}
    >
      {/* Track */}
      <View style={[styles.track, { backgroundColor: colors.separator }]}>
        {/* Fill */}
        <View
          style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: Colors.primary }]}
        />
      </View>
      {/* Thumb */}
      <View
        style={[
          styles.thumb,
          {
            left: progress * width - 8,
            backgroundColor: Colors.primary,
            transform: [{ scale: dragging ? 1.3 : 1 }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 32,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    top: 8,
  },
});
