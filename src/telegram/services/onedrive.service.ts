/* OneDriveService removed — replaced by FirebaseStorageService.
   This stub prevents imports from breaking but will throw if used. */
import { Injectable } from '@nestjs/common';

@Injectable()
export class OneDriveService {
  constructor() {
    throw new Error(
      'OneDriveService was removed. Use FirebaseStorageService instead.',
    );
  }
}
