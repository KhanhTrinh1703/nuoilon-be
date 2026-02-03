import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('monthly_investment_reports')
@Unique('UQ_monthly_investment_reports_month_fund', ['reportMonth', 'fundName'])
export class MonthlyInvestmentReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 7 })
  reportMonth: string;

  @Column({ type: 'varchar', length: 255 })
  fundName: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: () => '0' })
  totalInvestment: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, default: () => '0' })
  totalCertificates: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: () => '0' })
  latestFundPrice: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0' })
  certificatesValue: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
