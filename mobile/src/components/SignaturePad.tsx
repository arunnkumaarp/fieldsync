import React, { useRef, useState } from 'react';
import { View, PanResponder, StyleSheet, Pressable, Text, Alert } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';

interface Props {
  width: number;
  height: number;
  // A local file:// PNG uri, produced by snapshotting the drawn strokes —
  // the same shape as PhotoCapture's onCapture, so both attachment types
  // flow through one upload path (see src/sync/uploadQueue.ts).
  onCapture: (localUri: string) => void;
  onClear?: () => void;
}

// A minimal freehand signature capture surface: PanResponder tracks touch
// points into an SVG path string, rendered live. On "Use signature", the
// whole canvas is snapshotted to a real PNG file via react-native-view-shot
// — that's what makes a signature just another local-uri attachment.
export function SignaturePad({ width, height, onCapture, onClear }: Props) {
  const [paths, setPaths] = useState<string[]>([]);
  const currentPath = useRef<string>('');
  const viewShotRef = useRef<ViewShot>(null);

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

  const handleDone = async () => {
    try {
      const uri = await viewShotRef.current?.capture?.();
      if (uri) onCapture(uri);
    } catch (error) {
      Alert.alert('Could not capture signature', error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <View>
      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }}>
        <View style={[styles.canvas, { width, height }]} {...panResponder.panHandlers}>
          <Svg width={width} height={height}>
            {paths.map((d, index) => (
              <Path key={index} d={d} stroke="#111827" strokeWidth={2.5} fill="none" />
            ))}
          </Svg>
        </View>
      </ViewShot>
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
