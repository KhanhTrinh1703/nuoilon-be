import 'dotenv/config';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppscriptsModule } from './appscripts/appscripts.module';
import { TelegramModule } from './telegram/telegram.module';
import { WebModule } from './web/web.module';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { ReportModule } from './report/report.module';
import { ScheduleModule } from './schedule/schedule.module';
import { CommonServicesModule } from './common/services.module';

const appMode = process.env.APP_MODE ?? 'web';
const isScheduleMode = appMode === 'schedule';

const clientModules = isScheduleMode
  ? [ScheduleModule]
  : [AppscriptsModule, TelegramModule, WebModule, ReportModule];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    CommonServicesModule,
    ...clientModules,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
