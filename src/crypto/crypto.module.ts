import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CryptoPriceService } from './crypto-price.service';
import { CryptoController } from './crypto.controller';

@Module({
  imports: [ConfigModule],
  controllers: [CryptoController],
  providers: [CryptoPriceService],
  exports: [CryptoPriceService],
})
export class CryptoModule {}
