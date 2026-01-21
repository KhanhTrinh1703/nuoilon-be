import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('excel_transactions')
export class ExcelTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp', nullable: true })
  transactionDate: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  capital: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, nullable: true })
  numberOfFundCertificate: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  transactionId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
