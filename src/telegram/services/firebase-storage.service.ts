import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import type { ServiceAccount } from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { Bucket } from '@google-cloud/storage';

interface UploadPayload {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  fileSize: number;
}

const LARGE_FILE_THRESHOLD_BYTES = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class FirebaseStorageService {
  private readonly logger = new Logger(FirebaseStorageService.name);
  private readonly bucketName: string;
  private readonly uploadFolder: string;
  private bucket: Bucket | null = null;
  private initialized = false;

  constructor(private readonly configService: ConfigService) {
    this.bucketName =
      this.configService.get<string>('firebase.storageBucket') ?? '';
    this.uploadFolder =
      this.configService.get<string>('firebase.uploadFolder') ?? '';

    const serviceAccountJson = this.configService.get<string>(
      'firebase.serviceAccountJson',
    );

    if (!this.bucketName) {
      this.logger.warn(
        'FIREBASE_STORAGE_BUCKET not configured; Firebase Storage disabled',
      );
      return;
    }

    if (!serviceAccountJson) {
      this.logger.warn(
        'FIREBASE_SERVICE_ACCOUNT_JSON not configured; Firebase Storage disabled',
      );
      return;
    }

    this.initializeFirebaseClient(serviceAccountJson);
  }

  async uploadImage(payload: UploadPayload): Promise<{ webUrl: string }> {
    if (!this.initialized || !this.bucket) {
      this.logger.error('Firebase Storage is not initialized');
      throw new Error('Storage not configured');
    }

    const path = this.buildStoragePath(payload.filename);
    const file = this.bucket.file(path);

    try {
      const stream = file.createWriteStream({
        metadata: {
          contentType: payload.mimeType,
        },
        resumable: payload.fileSize > LARGE_FILE_THRESHOLD_BYTES,
      });

      await new Promise<void>((resolve, reject) => {
        stream.on('error', (err) => reject(err));
        stream.on('finish', () => resolve());
        stream.end(payload.buffer);
      });

      // Make the file publicly readable and return a web URL
      try {
        await file.makePublic();
      } catch (err: unknown) {
        this.logger.warn(
          `Failed to make file public; falling back to signed URL: ${this.formatError(
            err,
          )}`,
        );
      }

      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${encodeURIComponent(path)}`;

      return { webUrl: publicUrl };
    } catch (err: unknown) {
      this.logger.error(
        `Failed to upload to Firebase Storage: ${this.formatError(err)}`,
      );
      throw err;
    }
  }

  private initializeFirebaseClient(serviceAccountJson: string): void {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount;

      if (getApps().length === 0) {
        initializeApp({
          credential: cert(serviceAccount),
          storageBucket: this.bucketName,
        });
      }

      this.bucket = getStorage().bucket(this.bucketName) as unknown as Bucket;
      this.initialized = true;
      this.logger.log('Firebase Storage initialized');
    } catch (err: unknown) {
      this.logger.error(
        `Failed to initialize Firebase client: ${this.formatError(err)}`,
      );
      this.initialized = false;
      this.bucket = null;
    }
  }

  private buildStoragePath(filename: string): string {
    const folder = this.uploadFolder
      ? `${this.sanitizeFolder(this.uploadFolder)}/`
      : '';
    const timestamp = Date.now();
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${folder}${timestamp}_${safeName}`;
  }

  private sanitizeFolder(folder: string): string {
    return folder.replace(/^\/+|\/+$/g, '');
  }

  private formatError(err: unknown): string {
    if (err instanceof Error) return err.stack ?? err.message;
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
}
