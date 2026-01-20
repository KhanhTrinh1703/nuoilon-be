import { Test, TestingModule } from '@nestjs/testing';
import { AppscriptsService } from './appscripts.service';

describe('AppscriptsService', () => {
  let service: AppscriptsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppscriptsService],
    }).compile();

    service = module.get<AppscriptsService>(AppscriptsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
