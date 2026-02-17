import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { extname } from 'path';
import {
  IMAGE_FILE_ALLOWED_EXTENSIONS,
  IMAGE_FILE_MAX_SIZE_BYTES,
  IMAGE_FILE_SIZE_ERROR_MESSAGE,
  IMAGE_FILE_TYPE_ERROR_MESSAGE,
} from '../../constants/file-upload.constants';
import { UploadImageResult, UploadPayload } from './dto/upload-image.dto';

export type { UploadImageResult, UploadPayload } from './dto/upload-image.dto';

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private readonly bucketName: string;
  private readonly uploadFolder: string;
  private client: SupabaseClient | null = null;

  constructor(private readonly configService: ConfigService) {
    this.bucketName =
      this.configService.get<string>('supabase.storageBucket') ?? '';
    this.uploadFolder =
      this.configService.get<string>('supabase.uploadFolder') ?? '';

    const supabaseUrl = this.configService.get<string>('supabase.url');
    const serviceRoleKey = this.configService.get<string>(
      'supabase.serviceRoleKey',
    );

    if (!this.bucketName) {
      this.logger.warn(
        'SUPABASE_STORAGE_BUCKET not configured; Supabase Storage disabled',
      );
      return;
    }

    if (!supabaseUrl || !serviceRoleKey) {
      this.logger.warn(
        'Supabase credentials (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are not configured; Supabase Storage disabled',
      );
      return;
    }

    this.initializeSupabaseClient(supabaseUrl, serviceRoleKey);
  }

  async uploadImage(payload: UploadPayload): Promise<UploadImageResult> {
    if (!this.client) {
      this.logger.error('Supabase Storage is not initialized');
      throw new Error('Storage not configured');
    }

    this.validateFilePayload(payload);

    const storageBucket = this.bucketName;
    const storagePath = this.buildStoragePath(payload.filename);
    const contentType = payload.mimeType;

    try {
      const { error } = await this.client.storage
        .from(storageBucket)
        .upload(storagePath, payload.buffer, {
          contentType,
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // build signed web URL
      const { data, error: signedErr } = await this.client.storage
        .from(storageBucket)
        .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

      if (signedErr) {
        this.logger.warn(
          `Failed to create signed URL for ${storageBucket}/${storagePath}: ${this.formatError(signedErr)}`,
        );
      }

      const webUrl = data?.signedUrl ?? '';

      return {
        webUrl,
        storageBucket,
        storagePath,
        contentType,
      };
    } catch (err: unknown) {
      this.logger.error(
        `Failed to upload to Supabase Storage: ${this.formatError(err)}`,
      );
      throw err;
    }
  }

  async createSignedUrl(
    storageBucket: string,
    storagePath: string,
  ): Promise<{ signedUrl: string; expiresAt: number }> {
    if (!this.client) {
      this.logger.error('Supabase Storage is not initialized');
      throw new ServiceUnavailableException('Storage not configured');
    }

    if (!storageBucket) {
      throw new BadRequestException('storageBucket is required');
    }

    if (!storagePath) {
      throw new BadRequestException('storagePath is required');
    }

    const { data, error } = await this.client.storage
      .from(storageBucket)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    if (error) {
      this.logger.warn(
        `Failed to create signed URL for ${storageBucket}/${storagePath}: ${this.formatError(error)}`,
      );
      throw new ServiceUnavailableException('Unable to create signed URL');
    }

    const signedUrl = data?.signedUrl ?? '';
    if (!signedUrl) {
      throw new ServiceUnavailableException('Unable to create signed URL');
    }

    return {
      signedUrl,
      expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
    };
  }

  private initializeSupabaseClient(url: string, serviceRoleKey: string): void {
    try {
      this.client = createClient(url, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      this.logger.log('Supabase Storage initialized');
    } catch (err: unknown) {
      this.logger.error(
        `Failed to initialize Supabase client: ${this.formatError(err)}`,
      );
      this.client = null;
    }
  }

  private validateFilePayload(payload: UploadPayload): void {
    if (payload.fileSize > IMAGE_FILE_MAX_SIZE_BYTES) {
      throw new BadRequestException(IMAGE_FILE_SIZE_ERROR_MESSAGE);
    }

    const normalizedExtension = extname(payload.filename ?? '').toLowerCase();
    if (
      !normalizedExtension ||
      !IMAGE_FILE_ALLOWED_EXTENSIONS.includes(normalizedExtension)
    ) {
      this.logger.warn(`IMAGE_FILE_TYPE_ERROR_MESSAGE: ${normalizedExtension}`);
      throw new BadRequestException(IMAGE_FILE_TYPE_ERROR_MESSAGE);
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
    if (err instanceof Error) {
      return err.stack ?? err.message;
    }
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
}
