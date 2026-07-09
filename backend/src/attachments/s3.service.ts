import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class S3Service {
  private client: S3Client;
  private bucket: string;
  private publicBaseUrl: string;

  constructor(private config: ConfigService) {
    this.bucket = this.config.get<string>('S3_BUCKET', 'fieldsync-attachments');
    this.publicBaseUrl = this.config.get<string>(
      'S3_PUBLIC_BASE_URL',
      'http://localhost:9000/fieldsync-attachments',
    );
    this.client = new S3Client({
      region: this.config.get<string>('S3_REGION', 'auto'),
      endpoint: this.config.get<string>('S3_ENDPOINT'),
      forcePathStyle: this.config.get<string>('S3_FORCE_PATH_STYLE', 'true') === 'true',
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY_ID', ''),
        secretAccessKey: this.config.get<string>('S3_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  // Returns a short-lived PUT URL the mobile client uploads the raw
  // photo/signature bytes to directly, plus the public URL that will resolve
  // once the object exists — the backend never proxies attachment bytes.
  async createUploadUrl(contentType: string, extension: string) {
    const key = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: 900 });
    const remoteUrl = `${this.publicBaseUrl}/${key}`;
    return { uploadUrl, remoteUrl, key };
  }
}
