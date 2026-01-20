import { Test, TestingModule } from '@nestjs/testing';
import { AppscriptsController } from './appscripts.controller';

describe('AppscriptsController', () => {
  let controller: AppscriptsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppscriptsController],
    }).compile();

    controller = module.get<AppscriptsController>(AppscriptsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
