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

  @Get('favicon.png')
  async getFaviconPng(): Promise<StreamableFile> {
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

  @Get('favicon.ico')
  async getFaviconIco(): Promise<StreamableFile> {
    const imagePath = join(__dirname, '..', 'public', 'nuoilon.ico');

    // Check if file exists
    try {
      await access(imagePath);
    } catch {
      throw new NotFoundException('Report image not found');
    }

    const file = createReadStream(imagePath);

    return new StreamableFile(file, {
      type: 'image/x-icon',
      disposition: `inline; filename="nuoilon.ico"`,
    });
  }
}
