import { Module } from '@nestjs/common';
import { AppscriptsController } from './appscripts.controller';
import { AppscriptsService } from './appscripts.service';

@Module({
  controllers: [AppscriptsController],
  providers: [AppscriptsService]
})
export class AppscriptsModule {}
