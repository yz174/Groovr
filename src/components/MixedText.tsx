import React from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';

interface MixedTextProps {
  children: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

export default function MixedText({ children, style, numberOfLines }: MixedTextProps) {
  const segments = children.split(/(\d+)/);

  if (segments.length === 1) {
    // No digits — render normally
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {children}
      </Text>
    );
  }

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {segments.map((seg, i) =>
        /^\d+$/.test(seg)
          ? <Text key={i} style={{ fontFamily: 'sans-serif', fontWeight: 'bold' }}>{seg}</Text>
          : seg
      )}
    </Text>
  );
}
