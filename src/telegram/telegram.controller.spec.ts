import { Test, TestingModule } from '@nestjs/testing';
import { TelegramController } from './telegram.controller';

import { TelegramService } from './telegram.service';
import { TelegramQstashService } from './services/telegram-qstash.service';
import { GeminiService } from '../common/services/ai/gemini.service';
import { OpenAICompatibleOcrService } from '../common/services/ai/openai-compatible-ocr.service';
import { DisableInProductionGuard } from '../common/guards/disable-in-production.guard';
import { UpstashSignatureGuard } from '../common/guards/upstash-signature.guard';
import { HmacSignatureGuard } from '../common/guards/hmac-signature.guard';

describe('TelegramController', () => {
  let controller: TelegramController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TelegramController],
      providers: [
        {
          provide: TelegramService,
          useValue: {
            handleUpdate: jest.fn(),
            handleOcrResultCallback: jest.fn(),
            handleOcrErrorCallback: jest.fn(),
            handleOcrPublishCallback: jest.fn(),
          },
        },
        {
          provide: TelegramQstashService,
          useValue: {
            publishOcrJob: jest.fn(),
            publishOcrResult: jest.fn(),
          },
        },
        {
          provide: GeminiService,
          useValue: {
            performOcr: jest.fn(),
          },
        },
        {
          provide: OpenAICompatibleOcrService,
          useValue: {
            performOcr: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(DisableInProductionGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(UpstashSignatureGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(HmacSignatureGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TelegramController>(TelegramController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
