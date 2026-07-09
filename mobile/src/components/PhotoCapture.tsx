import React from 'react';
import { View, Text, Pressable, Image, StyleSheet, Alert } from 'react-native';
import { launchCamera } from 'react-native-image-picker';

interface Props {
  photoUri?: string;
  onCapture: (uri: string) => void;
}

export function PhotoCapture({ photoUri, onCapture }: Props) {
  const handleTakePhoto = async () => {
    const result = await launchCamera({ mediaType: 'photo', saveToPhotos: false, quality: 0.7 });
    if (result.didCancel) return;
    if (result.errorCode) {
      Alert.alert('Camera error', result.errorMessage ?? result.errorCode);
      return;
    }
    const uri = result.assets?.[0]?.uri;
    if (uri) onCapture(uri);
  };

  return (
    <View>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>No photo captured</Text>
        </View>
      )}
      <Pressable style={styles.button} onPress={handleTakePhoto}>
        <Text style={styles.buttonLabel}>{photoUri ? 'Retake photo' : 'Take photo'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { width: '100%', height: 200, borderRadius: 8, marginBottom: 12, backgroundColor: '#E5E7EB' },
  placeholder: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { color: '#9CA3AF' },
  button: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonLabel: { color: '#374151', fontWeight: '600' },
});
