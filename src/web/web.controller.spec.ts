import { Test, TestingModule } from '@nestjs/testing';
import { WebController } from './web.controller';

import { WebService } from './web.service';
import { UpstashSignatureGuard } from '../common/guards/upstash-signature.guard';

describe('WebController', () => {
  let controller: WebController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebController],
      providers: [
        {
          provide: WebService,
          useValue: {
            crawlFundPrices: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(UpstashSignatureGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WebController>(WebController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
