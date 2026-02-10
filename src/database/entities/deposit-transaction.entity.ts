import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('deposit_transactions')
export class DepositTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp' })
  transactionDate: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  capital: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  transactionId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
