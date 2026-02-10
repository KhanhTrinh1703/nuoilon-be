import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { FundPrice } from '../../database/entities/fund-price.entity';

@Injectable()
export class FundPriceRepository extends Repository<FundPrice> {
  constructor(private dataSource: DataSource) {
    super(FundPrice, dataSource.createEntityManager());
  }

  async upsertFundPrice(name: string, price: number): Promise<FundPrice> {
    const fundPrice = await this.findOne({ where: { name } });

    if (fundPrice) {
      fundPrice.price = price;
      return this.save(fundPrice);
    }

    return this.save(this.create({ name, price }));
  }
}
