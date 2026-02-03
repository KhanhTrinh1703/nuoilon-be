import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
// import { ReportService } from '../src/report/report.service';
import { ReportImageService } from '../src/telegram/services/report-image.service';

async function run() {
  try {
    const app = await NestFactory.create(AppModule, { logger: false });
    // const reportService = app.get(ReportService);
    const reportImageService = app.get(ReportImageService);

    console.log('Calling ReportImageService.generateReportImages()...');
    await reportImageService.generateReportImage();

    await app.close();
    process.exit(0);
  } catch (err) {
    console.error('Error while running script:', err);
    process.exit(1);
  }
}

void run();
