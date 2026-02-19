import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WebService } from './web.service';
import { UpstashSignatureGuard } from '../common/guards/upstash-signature.guard';

@ApiTags('web')
@Controller({ path: 'web', version: '1' })
export class WebController {
  constructor(private readonly webService: WebService) {}

  @Post('crawl-fund-prices')
  @UseGuards(UpstashSignatureGuard)
  @ApiTags('Crawl Fund Prices')
  @ApiOperation({ summary: 'Crawl fund prices using Gemini AI' })
  async crawlFundPrices() {
    return await this.webService.crawlFundPrices();
  }
}
