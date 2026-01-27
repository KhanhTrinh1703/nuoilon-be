/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unused-vars */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import axios from 'axios';

interface UploadPayload {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  fileSize: number;
}

const SIMPLE_UPLOAD_LIMIT_BYTES = 4 * 1024 * 1024; // 4 MB
const CHUNK_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class OneDriveService {
  private readonly logger = new Logger(OneDriveService.name);
  private readonly uploadFolder: string;
  private readonly userId: string;
  private client?: Client;

  constructor(private readonly configService: ConfigService) {
    this.uploadFolder = this.sanitizeFolder(
      this.configService.get<string>('onedrive.uploadFolder') ?? 'BotUploads',
    );
    this.userId = this.configService.get<string>('onedrive.userId') ?? '';

    const tenantId = this.configService.get<string>('onedrive.tenantId') ?? '';
    const clientId = this.configService.get<string>('onedrive.clientId') ?? '';
    const clientSecret =
      this.configService.get<string>('onedrive.clientSecret') ?? '';

    if (!tenantId || !clientId || !clientSecret || !this.userId) {
      this.logger.warn(
        'OneDrive credentials are missing. Telegram image uploads are disabled until ONEDRIVE_* variables are configured.',
      );
      return;
    }

    const credential = new ClientSecretCredential(
      tenantId,
      clientId,
      clientSecret,
    );

    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ['https://graph.microsoft.com/.default'],
    });

    this.client = Client.initWithMiddleware({ authProvider });
  }

  async uploadImage(payload: UploadPayload): Promise<{ webUrl: string }> {
    if (!this.client) {
      throw new Error(
        'OneDrive client is not configured. Set ONEDRIVE_* environment variables and restart the server.',
      );
    }

    await this.ensureUploadFolder();

    const graphPath = this.getUploadPath(payload.filename);

    if (payload.fileSize <= SIMPLE_UPLOAD_LIMIT_BYTES) {
      const driveItem = await this.client
        .api(`/users/${this.userId}/drive/root:/${graphPath}:/content`)
        .headers({ 'Content-Type': payload.mimeType })
        .put(payload.buffer);

      return { webUrl: driveItem.webUrl };
    }

    const uploadSession = await this.client
      .api(
        `/users/${this.userId}/drive/root:/${graphPath}:/createUploadSession`,
      )
      .post({
        item: {
          '@microsoft.graph.conflictBehavior': 'replace',
          name: payload.filename,
        },
      });

    if (!uploadSession?.uploadUrl) {
      throw new Error('Unable to create OneDrive upload session.');
    }

    const driveItem = await this.uploadLargeFile(
      uploadSession.uploadUrl,
      payload.buffer,
    );

    return { webUrl: driveItem.webUrl };
  }

  private sanitizeFolder(folder: string): string {
    return folder.replace(/(^\/+|\/+$)/g, '');
  }

  private getUploadPath(filename: string): string {
    return `${this.uploadFolder}/${filename}`;
  }

  private async ensureUploadFolder(): Promise<void> {
    if (!this.client) return;

    try {
      await this.client
        .api(`/users/${this.userId}/drive/root:/${this.uploadFolder}`)
        .get();
    } catch (err) {
      // create folder if not exists
      await this.client.api(`/users/${this.userId}/drive/root/children`).post({
        name: this.uploadFolder,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'replace',
      });
    }
  }

  private async uploadLargeFile(uploadUrl: string, buffer: Buffer) {
    let start = 0;
    const total = buffer.length;

    while (start < total) {
      const end = Math.min(start + CHUNK_SIZE_BYTES, total) - 1;
      const chunk = buffer.slice(start, end + 1);

      const headers = {
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Content-Length': `${chunk.length}`,
      };

      const resp = await axios.put(uploadUrl, chunk, { headers });

      if (resp.status >= 200 && resp.status < 300 && resp.data) {
        // if final response contains the item
        if (resp.data.webUrl) return resp.data;
      }

      start = end + 1;
    }

    // Finalize by fetching the item
    const urlParts = uploadUrl.split('?')[0].split('/');
    const itemId = urlParts[urlParts.length - 1];
    const client = this.client as Client;
    const driveItem = await client.api(`/me/drive/items/${itemId}`).get();
    return driveItem;
  }
}
