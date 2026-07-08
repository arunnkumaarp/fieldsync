import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import type { FieldConfig } from '../forms/jobFormSchema';

interface Props {
  fields: FieldConfig[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

export function DynamicForm({ fields, values, onChange }: Props) {
  return (
    <View>
      {fields.map((field) => (
        <View key={field.key} style={styles.fieldContainer}>
          <Text style={styles.label}>{field.label}</Text>
          {renderField(field, values[field.key], onChange)}
        </View>
      ))}
    </View>
  );
}

function renderField(field: FieldConfig, value: unknown, onChange: (key: string, value: unknown) => void) {
  switch (field.type) {
    case 'select':
      return (
        <View style={styles.optionsRow}>
          {(field.options ?? []).map((option) => {
            const selected = value === option;
            return (
              <Pressable
                key={option}
                style={[styles.optionChip, selected && styles.optionChipSelected]}
                onPress={() => onChange(field.key, option)}
              >
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
      );
    case 'number':
      return (
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={value === undefined || value === null ? '' : String(value)}
          onChangeText={(text) => onChange(field.key, text === '' ? undefined : Number(text))}
        />
      );
    case 'notes':
      return (
        <TextInput
          style={[styles.input, styles.multiline]}
          multiline
          numberOfLines={4}
          value={typeof value === 'string' ? value : ''}
          onChangeText={(text) => onChange(field.key, text)}
        />
      );
    case 'text':
    default:
      return (
        <TextInput
          style={styles.input}
          value={typeof value === 'string' ? value : ''}
          onChangeText={(text) => onChange(field.key, text)}
        />
      );
  }
}

const styles = StyleSheet.create({
  fieldContainer: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  optionChipSelected: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  optionLabel: { fontSize: 13, color: '#374151' },
  optionLabelSelected: { color: '#FFFFFF', fontWeight: '600' },
});
