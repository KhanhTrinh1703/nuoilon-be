import { Test, TestingModule } from '@nestjs/testing';
import { TelegramService } from './telegram.service';

import { ConfigService } from '@nestjs/config';
import { ReportImageService } from './services/report-image.service';
import { TelegramConversationService } from './services/telegram-conversation.service';
import { TelegramCommandsService } from './services/telegram-commands.service';
import { TelegramDepositService } from './services/telegram-deposit.service';
import { TelegramCertificateService } from './services/telegram-certificate.service';
import { TelegramPhotoService } from './services/telegram-photo.service';
import { TelegramOcrService } from './services/telegram-ocr.service';

describe('TelegramService', () => {
  let service: TelegramService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(''),
          },
        },
        {
          provide: ReportImageService,
          useValue: {},
        },
        {
          provide: TelegramConversationService,
          useValue: {
            startCleanup: jest.fn(),
          },
        },
        {
          provide: TelegramCommandsService,
          useValue: {},
        },
        {
          provide: TelegramDepositService,
          useValue: {},
        },
        {
          provide: TelegramCertificateService,
          useValue: {},
        },
        {
          provide: TelegramPhotoService,
          useValue: {},
        },
        {
          provide: TelegramOcrService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<TelegramService>(TelegramService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
