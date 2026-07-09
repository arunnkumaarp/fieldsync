import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useJob } from '../hooks/useJobs';
import { useSubmissionsForJob, useAttachmentsForSubmission } from '../hooks/useSubmissions';
import { DynamicForm } from '../components/DynamicForm';
import { PhotoCapture } from '../components/PhotoCapture';
import { SignaturePad } from '../components/SignaturePad';
import { jobFormSchema } from '../forms/jobFormSchema';
import { createSubmission, createAttachment } from '../db/mutations';
import { captureGpsTag } from '../utils/gps';
import type Submission from '../db/models/Submission';

type Props = NativeStackScreenProps<RootStackParamList, 'JobDetail'>;

const SIGNATURE_WIDTH = Dimensions.get('window').width - 32;

export function JobDetailScreen({ route }: Props) {
  const { jobId } = route.params;
  const database = useDatabase();
  const job = useJob(jobId);
  const submissions = useSubmissionsForJob(jobId);

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [signatureUri, setSignatureUri] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  if (!job) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  const handleFieldChange = (key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const gps = await captureGpsTag();
      const submission = await createSubmission(database, jobId, {
        ...values,
        _meta: { submittedAt: new Date().toISOString(), gps },
      });

      if (photoUri) {
        await createAttachment(database, submission.id, 'photo', photoUri);
      }
      if (signatureUri) {
        await createAttachment(database, submission.id, 'signature', signatureUri);
      }

      setValues({});
      setPhotoUri(undefined);
      setSignatureUri(undefined);
      Alert.alert('Saved', 'Submission saved locally.' + (gps ? '' : ' (GPS unavailable — saved without location.)'));
    } catch (error) {
      Alert.alert('Could not save submission', error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.jobTitle}>{job.title}</Text>
      {job.description ? <Text style={styles.jobDescription}>{job.description}</Text> : null}
      <Text style={styles.jobStatus}>{job.status.replace('_', ' ')}</Text>

      <Section title={`Past submissions (${submissions.length})`}>
        {submissions.length === 0 ? (
          <Text style={styles.mutedText}>No submissions yet</Text>
        ) : (
          submissions.map((submission) => <SubmissionSummary key={submission.id} submission={submission} />)
        )}
      </Section>

      <Section title="New submission">
        <DynamicForm fields={jobFormSchema} values={values} onChange={handleFieldChange} />

        <Text style={styles.label}>Photo</Text>
        <PhotoCapture photoUri={photoUri} onCapture={setPhotoUri} />

        <Text style={[styles.label, styles.signatureLabel]}>Signature</Text>
        <SignaturePad width={SIGNATURE_WIDTH} height={160} onCapture={setSignatureUri} onClear={() => setSignatureUri(undefined)} />
        {signatureUri ? <Text style={styles.capturedNote}>Signature captured ✓</Text> : null}

        <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitLabel}>Submit</Text>}
        </Pressable>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SubmissionSummary({ submission }: { submission: Submission }) {
  const attachments = useAttachmentsForSubmission(submission.id);
  return (
    <View style={styles.submissionRow}>
      <View style={styles.submissionHeader}>
        <Text style={styles.submissionDate}>{submission.lastModified.toLocaleString()}</Text>
        {submission.needsReview ? (
          <View style={styles.reviewBadge}>
            <Text style={styles.reviewBadgeLabel}>Needs review</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.mutedText}>
        {Object.keys(submission.data).filter((k) => k !== '_meta').length} field(s) · {attachments.length} attachment(s)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16, paddingBottom: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  jobTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  jobDescription: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  jobStatus: { fontSize: 11, fontWeight: '700', color: '#2563EB', textTransform: 'uppercase', marginTop: 8 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  signatureLabel: { marginTop: 8 },
  capturedNote: { color: '#16A34A', fontSize: 12, marginTop: 6 },
  mutedText: { color: '#9CA3AF', fontSize: 13 },
  submissionRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  submissionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  submissionDate: { fontSize: 13, color: '#374151', fontWeight: '600' },
  reviewBadge: { backgroundColor: '#FEF3C7', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  reviewBadgeLabel: { fontSize: 11, color: '#92400E', fontWeight: '700' },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitLabel: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
