export interface UploadPayload {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  fileSize: number;
}

export interface UploadImageResult {
  webUrl: string;
  storageBucket: string;
  storagePath: string;
  contentType: string;
}
