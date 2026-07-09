// The form rendered per submission is driven by this config rather than
// hardcoded JSX — adding/removing/reordering a field means editing this
// array, not the screen. There's no per-job form schema on the backend yet
// (Submission.data is just a free-form JSON blob), so every job currently
// renders the same template; swapping this for a per-job-type schema later
// wouldn't require touching DynamicForm itself.
export type FieldType = 'text' | 'number' | 'select' | 'notes';

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
}

export const jobFormSchema: FieldConfig[] = [
  { key: 'filter_condition', label: 'Filter condition', type: 'select', options: ['good', 'fair', 'needs_replacement'] },
  { key: 'refrigerant_psi', label: 'Refrigerant (psi)', type: 'number' },
  { key: 'notes', label: 'Notes', type: 'notes' },
];
