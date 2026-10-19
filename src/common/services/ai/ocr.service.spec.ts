import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiService } from './gemini.service';
import { OpenAICompatibleOcrService } from './openai-compatible-ocr.service';
import { OcrService } from './ocr.service';
import { GeminiOcrResponseDto } from './dto';

describe('OcrService', () => {
  let fakeGeminiService: { performOcr: jest.Mock };
  let fakeOpenAICompatibleOcrService: { performOcr: jest.Mock };
  let configService: { get: jest.Mock };

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const fakeGeminiResult: GeminiOcrResponseDto = {
    type: 'deposit',
    amount: 1000000,
    currency: 'VND',
    confidence: 0.99,
  };

  const fakeLlmResult: GeminiOcrResponseDto = {
    type: 'certificate',
    matched_price: 25000,
    matched_quantity: 50,
    confidence: 0.99,
  };

  const dummyBuffer = Buffer.from('image-data');
  const dummyMimeType = 'image/jpeg';

  beforeEach(() => {
    fakeGeminiService = {
      performOcr: jest.fn().mockResolvedValue(fakeGeminiResult),
    };
    fakeOpenAICompatibleOcrService = {
      performOcr: jest.fn().mockResolvedValue(fakeLlmResult),
    };
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'gemini.models') return ['gemini-1.5-flash'];
        if (key === 'llmProvider.model') return 'gpt-4o-mini';
        return undefined;
      }),
    };
  });

  const createService = (provider = 'gemini') => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'ocr.provider') return provider;
      if (key === 'gemini.models') return ['gemini-1.5-flash'];
      if (key === 'llmProvider.model') return 'gpt-4o-mini';
      return undefined;
    });

    return new OcrService(
      configService as unknown as ConfigService,
      fakeGeminiService as unknown as GeminiService,
      fakeOpenAICompatibleOcrService as unknown as OpenAICompatibleOcrService,
    );
  };

  it('uses fake gemini provider when configured as gemini', async () => {
    const service = createService('gemini');
    const result = await service.performOcr(dummyBuffer, dummyMimeType);

    expect(result).toEqual({
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      resultJson: fakeGeminiResult,
    });
    expect(fakeGeminiService.performOcr).toHaveBeenCalledWith(
      dummyBuffer,
      dummyMimeType,
    );
    expect(fakeOpenAICompatibleOcrService.performOcr).not.toHaveBeenCalled();
  });

  it('uses fake llm provider when configured as llm', async () => {
    const service = createService('llm');
    const result = await service.performOcr(dummyBuffer, dummyMimeType);

    expect(result).toEqual({
      provider: 'llm',
      model: 'gpt-4o-mini',
      resultJson: fakeLlmResult,
    });
    expect(fakeOpenAICompatibleOcrService.performOcr).toHaveBeenCalledWith(
      dummyBuffer,
      dummyMimeType,
    );
    expect(fakeGeminiService.performOcr).not.toHaveBeenCalled();
  });

  it('falls back to fake gemini provider when llm provider fails', async () => {
    fakeOpenAICompatibleOcrService.performOcr.mockRejectedValue(
      new Error('llm error'),
    );
    const service = createService('llm');
    const result = await service.performOcr(dummyBuffer, dummyMimeType);

    expect(result).toEqual({
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      resultJson: fakeGeminiResult,
    });
    expect(fakeOpenAICompatibleOcrService.performOcr).toHaveBeenCalledWith(
      dummyBuffer,
      dummyMimeType,
    );
    expect(fakeGeminiService.performOcr).toHaveBeenCalledWith(
      dummyBuffer,
      dummyMimeType,
    );
  });
});
