import { Test, TestingModule } from '@nestjs/testing';
import { AppscriptsController } from './appscripts.controller';

import { AppscriptsService } from './appscripts.service';
import { HmacSignatureGuard } from '../common/guards/hmac-signature.guard';

describe('AppscriptsController', () => {
  let controller: AppscriptsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppscriptsController],
      providers: [
        {
          provide: AppscriptsService,
          useValue: {
            upsertDepositTransaction: jest.fn(),
            upsertCertificateTransaction: jest.fn(),
            upsertExcelTransaction: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(HmacSignatureGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AppscriptsController>(AppscriptsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
