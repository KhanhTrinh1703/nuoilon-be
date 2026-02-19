import {
  Controller,
  Get,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { AppService } from './app.service';
import { join } from 'path';
import { createReadStream } from 'fs';
import { access } from 'fs/promises';
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get(['favicon.ico', 'favicon.png'])
  async getFavicon(): Promise<StreamableFile> {
    const imagePath = join(__dirname, '..', 'public', 'nuoilon.png');

    // Check if file exists
    try {
      await access(imagePath);
    } catch {
      throw new NotFoundException('Report image not found');
    }

    const file = createReadStream(imagePath);

    return new StreamableFile(file, {
      type: 'image/png',
      disposition: `inline; filename="nuoilon.png"`,
    });
  }
}
