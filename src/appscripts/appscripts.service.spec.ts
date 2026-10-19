import { Test, TestingModule } from '@nestjs/testing';
import { AppscriptsService } from './appscripts.service';

import { DepositTransactionRepository } from './repositories/deposit-transaction.repository';
import { CertificateTransactionRepository } from './repositories/certificate-transaction.repository';

describe('AppscriptsService', () => {
  let service: AppscriptsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppscriptsService,
        {
          provide: DepositTransactionRepository,
          useValue: {
            upsertTransaction: jest.fn(),
          },
        },
        {
          provide: CertificateTransactionRepository,
          useValue: {
            upsertTransaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AppscriptsService>(AppscriptsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
