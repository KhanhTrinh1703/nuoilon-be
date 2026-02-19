import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseStorageService } from './services/storage/supabase-storage.service';
import { GeminiService } from './services/ai/gemini.service';
import { UpstashQstashService } from './services/messaging/upstash-qstash.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SupabaseStorageService, GeminiService, UpstashQstashService],
  exports: [SupabaseStorageService, GeminiService, UpstashQstashService],
})
export class CommonServicesModule {}
