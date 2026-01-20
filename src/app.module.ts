import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppscriptsModule } from './appscripts/appscripts.module';
import { TelegramModule } from './telegram/telegram.module';
import { WebModule } from './web/web.module';

@Module({
  imports: [AppscriptsModule, TelegramModule, WebModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
