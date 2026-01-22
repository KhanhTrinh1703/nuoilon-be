import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('telegram')
@Controller('telegram')
export class TelegramController {}
