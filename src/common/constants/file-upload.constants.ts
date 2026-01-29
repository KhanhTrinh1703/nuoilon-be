export const IMAGE_FILE_MAX_SIZE_BYTES = 25 * 1024 * 1024;

export const IMAGE_FILE_SIZE_LIMIT_LABEL = '25MB';

export const IMAGE_FILE_ALLOWED_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

export const IMAGE_FILE_ALLOWED_EXTENSIONS: readonly string[] = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
];

export const IMAGE_FILE_SIZE_ERROR_MESSAGE = `File size exceeds ${IMAGE_FILE_SIZE_LIMIT_LABEL} limit`;

export const IMAGE_FILE_TYPE_ERROR_MESSAGE = 'Only image files are allowed';
