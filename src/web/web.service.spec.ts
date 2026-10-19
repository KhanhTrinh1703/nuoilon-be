import { Test, TestingModule } from '@nestjs/testing';
import { WebService } from './web.service';

import { GeminiService } from '../common/services/ai/gemini.service';
import { FundPriceRepository } from './repositories/fund-price.repository';

describe('WebService', () => {
  let service: WebService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebService,
        {
          provide: GeminiService,
          useValue: {
            getCertificatePrice: jest.fn(),
          },
        },
        {
          provide: FundPriceRepository,
          useValue: {
            upsertFundPrice: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WebService>(WebService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
