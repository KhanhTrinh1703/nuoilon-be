import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseStorageService } from './services/storage/supabase-storage.service';
import { GeminiService } from './services/ai/gemini.service';
import { OpenAICompatibleOcrService } from './services/ai/openai-compatible-ocr.service';
import { OcrService } from './services/ai/ocr.service';
import { UpstashQstashService } from './services/messaging/upstash-qstash.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    SupabaseStorageService,
    GeminiService,
    OpenAICompatibleOcrService,
    OcrService,
    UpstashQstashService,
  ],
  exports: [
    SupabaseStorageService,
    GeminiService,
    OpenAICompatibleOcrService,
    OcrService,
    UpstashQstashService,
  ],
})
export class CommonServicesModule {}
