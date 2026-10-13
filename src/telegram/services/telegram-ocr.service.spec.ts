import { Telegraf } from 'telegraf';
import { OcrJob, OcrJobStatus } from '../../database/entities/ocr-job.entity';
import { TelegramOcrService } from './telegram-ocr.service';

const payload = {
  jobId: 'job-1',
  idempotencyKey: 'file-key',
  chatId: 100,
  userId: 200,
};

function makeJob(overrides: Partial<OcrJob> = {}): OcrJob {
  return {
    id: 'job-1',
    status: OcrJobStatus.PENDING,
    tgFileUniqueId: 'file-key',
    tgChatId: '100',
    tgUserId: '200',
    attempts: 0,
    maxAttempts: 2,
    ...overrides,
  } as OcrJob;
}

describe('TelegramOcrService.startOcrJob', () => {
  let service: TelegramOcrService;
  let jobRepo: Record<string, jest.Mock>;
  let qstash: { publishOcrJob: jest.Mock; publishOcrResult: jest.Mock };
  let ocrService: { performOcr: jest.Mock };
  let bot: { telegram: { sendMessage: jest.Mock } };

  beforeEach(() => {
    jobRepo = {
      findById: jest.fn().mockResolvedValue(makeJob()),
      incrementAttempts: jest.fn(),
      updateLastError: jest.fn(),
      updateStatus: jest.fn(),
      markFailed: jest.fn(),
    };
    qstash = {
      publishOcrJob: jest.fn().mockResolvedValue(undefined),
      publishOcrResult: jest.fn().mockResolvedValue(undefined),
    };
    ocrService = {
      performOcr: jest.fn().mockRejectedValue(new Error('provider down')),
    };
    bot = { telegram: { sendMessage: jest.fn().mockResolvedValue({}) } };

    service = new TelegramOcrService(
      jobRepo as never,
      {} as never,
      {} as never,
      qstash as never,
      {} as never,
      ocrService as never,
      {} as never,
    );

    // The image download is not what is under test.
    jest
      .spyOn(service as never, 'getSignedUrlForImage')
      .mockResolvedValue('https://signed' as never);
    jest
      .spyOn(service as never, 'downloadImageFromSupabase')
      .mockResolvedValue({
        buffer: Buffer.from('x'),
        mimeType: 'image/jpeg',
      } as never);
  });

  const run = () => service.startOcrJob(bot as unknown as Telegraf, payload);

  it('retries when OCR fails and attempts remain', async () => {
    jobRepo.incrementAttempts.mockResolvedValue(makeJob({ attempts: 1 }));
    jobRepo.updateLastError.mockResolvedValue(makeJob({ attempts: 1 }));

    await expect(run()).resolves.toBeUndefined();

    expect(jobRepo.updateLastError).toHaveBeenCalledWith(
      'job-1',
      'provider down',
    );
    expect(jobRepo.updateStatus).toHaveBeenCalledWith(
      'job-1',
      OcrJobStatus.PENDING,
    );
    expect(qstash.publishOcrJob).toHaveBeenCalledTimes(1);
    expect(jobRepo.markFailed).not.toHaveBeenCalled();
    expect(bot.telegram.sendMessage).not.toHaveBeenCalled();
  });

  it('marks the job failed and notifies the user when attempts are exhausted', async () => {
    const exhausted = makeJob({ attempts: 2 });
    jobRepo.incrementAttempts.mockResolvedValue(exhausted);
    jobRepo.updateLastError.mockResolvedValue(exhausted);
    jobRepo.markFailed.mockResolvedValue({
      ...exhausted,
      status: OcrJobStatus.FAILED,
    });

    await expect(run()).resolves.toBeUndefined();

    expect(jobRepo.markFailed).toHaveBeenCalledWith('job-1', 'provider down');
    expect(qstash.publishOcrJob).not.toHaveBeenCalled();
    expect(bot.telegram.sendMessage).toHaveBeenCalledWith(
      100,
      expect.stringContaining('Không thể xử lý ảnh'),
    );
  });

  it('fails the job when the retry cannot be republished', async () => {
    const first = makeJob({ attempts: 1 });
    jobRepo.incrementAttempts.mockResolvedValue(first);
    jobRepo.updateLastError.mockResolvedValue(first);
    jobRepo.markFailed.mockResolvedValue({
      ...first,
      status: OcrJobStatus.FAILED,
    });
    qstash.publishOcrJob.mockRejectedValue(new Error('qstash down'));

    await run();

    expect(jobRepo.markFailed).toHaveBeenCalled();
    expect(bot.telegram.sendMessage).toHaveBeenCalled();
  });

  it('still resolves when notifying the user fails', async () => {
    const exhausted = makeJob({ attempts: 2 });
    jobRepo.incrementAttempts.mockResolvedValue(exhausted);
    jobRepo.updateLastError.mockResolvedValue(exhausted);
    jobRepo.markFailed.mockResolvedValue(exhausted);
    bot.telegram.sendMessage.mockRejectedValue(new Error('telegram down'));

    await expect(run()).resolves.toBeUndefined();
  });

  it('skips jobs that are no longer pending', async () => {
    jobRepo.findById.mockResolvedValue(
      makeJob({ status: OcrJobStatus.NEED_CONFIRM }),
    );

    await run();

    expect(ocrService.performOcr).not.toHaveBeenCalled();
    expect(jobRepo.incrementAttempts).not.toHaveBeenCalled();
  });

  it('publishes the result on success without touching attempts', async () => {
    ocrService.performOcr.mockResolvedValue({
      provider: 'gemini',
      model: 'm',
      resultJson: { type: 'deposit' },
    });

    await run();

    expect(qstash.publishOcrResult).toHaveBeenCalledWith('job-1', {
      provider: 'gemini',
      model: 'm',
      resultJson: { type: 'deposit' },
    });
    expect(jobRepo.incrementAttempts).not.toHaveBeenCalled();
  });
});
