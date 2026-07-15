import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CryptoPrice, CryptoPriceService } from './crypto-price.service';

@ApiTags('crypto')
@Controller({ path: 'crypto', version: '1' })
export class CryptoController {
  constructor(private readonly cryptoPriceService: CryptoPriceService) {}

  @Get('prices')
  @ApiOperation({ summary: 'Fetch live crypto prices from Binance' })
  @ApiOkResponse({
    description: 'Current prices for all tracked cryptos',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'BTC' },
          price: { type: 'number', example: 65000.12 },
        },
      },
    },
  })
  async getPrices(): Promise<CryptoPrice[]> {
    try {
      return await this.cryptoPriceService.getAllPrices();
    } catch (error) {
      throw new ServiceUnavailableException(
        error instanceof Error
          ? error.message
          : 'Failed to fetch crypto prices',
      );
    }
  }
}
