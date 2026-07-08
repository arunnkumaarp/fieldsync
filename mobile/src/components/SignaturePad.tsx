import React, { useRef, useState } from 'react';
import { View, PanResponder, StyleSheet, Pressable, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Props {
  width: number;
  height: number;
  onCapture: (svgPathData: string) => void;
  onClear?: () => void;
}

// A minimal freehand signature capture surface: PanResponder tracks touch
// points into an SVG path string, which is what gets handed to onCapture.
// Rendering that path string back to a PNG (for upload) happens in phase 3
// alongside the actual upload queue — capturing it is all phase 2 needs.
export function SignaturePad({ width, height, onCapture, onClear }: Props) {
  const [paths, setPaths] = useState<string[]>([]);
  const currentPath = useRef<string>('');

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        const { locationX, locationY } = event.nativeEvent;
        currentPath.current = `M${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        setPaths((prev) => [...prev, currentPath.current]);
      },
      onPanResponderMove: (event) => {
        const { locationX, locationY } = event.nativeEvent;
        currentPath.current += ` L${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        setPaths((prev) => [...prev.slice(0, -1), currentPath.current]);
      },
      onPanResponderRelease: () => {
        currentPath.current = '';
      },
    }),
  ).current;

  const handleClear = () => {
    setPaths([]);
    onClear?.();
  };

  const handleDone = () => {
    onCapture(paths.join(' '));
  };

  return (
    <View>
      <View style={[styles.canvas, { width, height }]} {...panResponder.panHandlers}>
        <Svg width={width} height={height}>
          {paths.map((d, index) => (
            <Path key={index} d={d} stroke="#111827" strokeWidth={2.5} fill="none" />
          ))}
        </Svg>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.secondaryButton} onPress={handleClear}>
          <Text style={styles.secondaryButtonLabel}>Clear</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={handleDone} disabled={paths.length === 0}>
          <Text style={styles.primaryButtonLabel}>Use signature</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  secondaryButton: { paddingHorizontal: 14, paddingVertical: 10 },
  secondaryButtonLabel: { color: '#6B7280', fontWeight: '600' },
  primaryButton: { backgroundColor: '#2563EB', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  primaryButtonLabel: { color: '#FFFFFF', fontWeight: '600' },
});
