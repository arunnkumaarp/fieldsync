import { Database, Q } from '@nozbe/watermelondb';
import type { ApiClient } from '../api/client';
import Attachment from '../db/models/Attachment';

interface SignedUrlResponse {
  uploadUrl: string;
  remoteUrl: string;
}

const CONTENT_TYPE_BY_TYPE: Record<string, { contentType: string; extension: string }> = {
  photo: { contentType: 'image/jpeg', extension: 'jpg' },
  signature: { contentType: 'image/png', extension: 'png' },
};

async function uploadFile(localUri: string, uploadUrl: string, contentType: string): Promise<void> {
  const fileResponse = await fetch(localUri);
  const blob = await fileResponse.blob();
  const putResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });
  if (!putResponse.ok) {
    throw new Error(`Upload failed with status ${putResponse.status}`);
  }
}

// The "queue" is just local WatermelonDB rows, not a separate table: any
// attachment whose metadata has already synced (_status === 'synced', so
// the server definitely has a row for it) but whose remote_url is still
// null is, by definition, waiting to be uploaded. That's durable across app
// restarts and lost connectivity for free — no extra bookkeeping needed.
export async function processUploadQueue(database: Database, api: ApiClient): Promise<number> {
  const pending = await database
    .get<Attachment>('attachments')
    .query(Q.where('_status', 'synced'), Q.where('remote_url', null))
    .fetch();

  let uploadedCount = 0;

  for (const attachment of pending) {
    if (!attachment.localUri) continue;

    const { contentType, extension } = CONTENT_TYPE_BY_TYPE[attachment.type] ?? CONTENT_TYPE_BY_TYPE.photo;

    try {
      const { uploadUrl, remoteUrl } = await api.post<SignedUrlResponse>('/attachments/signed-url', {
        contentType,
        extension,
      });

      await uploadFile(attachment.localUri, uploadUrl, contentType);
      await api.patch(`/attachments/${attachment.id}/remote-url`, { remoteUrl });

      // This marks the local row dirty again (WatermelonDB has no "update
      // without marking changed" API), even though the server already has
      // this exact value from the PATCH above. It costs one harmless no-op
      // push on the *next* sync to clear that dirty flag — cheaper to accept
      // than to reach into WatermelonDB's internal raw-record APIs to avoid it.
      await attachment.update((record) => {
        record.remoteUrl = remoteUrl;
        record.lastModified = new Date();
      });

      uploadedCount += 1;
    } catch {
      // Leave it pending — next processUploadQueue() call (next sync) will
      // retry. Connectivity drops mid-upload are the expected common case.
    }
  }

  return uploadedCount;
}
