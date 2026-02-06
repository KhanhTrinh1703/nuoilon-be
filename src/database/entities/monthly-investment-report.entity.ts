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

  /** Cumulative capital from inception to the report month. */
  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0' })
  totalCapital: number;

  /** Cumulative certificates from inception to the report month. */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: () => '0' })
  totalCertificates: number;

  /** Capital transacted within the report month only. */
  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0' })
  capitalInMonth: number;

  /** Certificates transacted within the report month only. */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: () => '0' })
  certificatesInMonth: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: () => '0' })
  latestFundPrice: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
