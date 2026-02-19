import { Injectable } from '@nestjs/common';
import { FundPrice } from 'src/database/entities/fund-price.entity';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class FundPriceRepository extends Repository<FundPrice> {
  constructor(private dataSource: DataSource) {
    super(FundPrice, dataSource.createEntityManager());
  }

  async upsertFundPrice(name: string, price: number): Promise<FundPrice> {
    const fundPrice = await this.findOne({ where: { name } });

    if (price < 1000) {
      price = price * 1000;
    }

    if (fundPrice) {
      // check new price is too different from old price, if so, doesn't update and return old price
      const oldPrice = fundPrice.price;
      const priceDifference = Math.abs(price - oldPrice);
      const priceDifferencePercentage = (priceDifference / oldPrice) * 100;

      if (priceDifferencePercentage > 15) {
        return fundPrice;
      }

      fundPrice.price = price;
      return this.save(fundPrice);
    } else {
      const newFundPrice = this.create({ name, price });
      return this.save(newFundPrice);
    }
  }
}
