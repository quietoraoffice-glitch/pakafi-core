import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { UserApp } from './user-app.entity';

export type AppStatus = 'ACTIVE' | 'DISABLED';

@Entity('apps')
export class AppEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  code: string; // ex: QUIETORA_CALC

  @Column({ type: 'varchar', length: 120 })
  name: string; // ex: Quietora Calc

  @Column({ type: 'varchar', length: 16, default: 'ACTIVE' })
  status: AppStatus;

  @Column({ type: 'varchar', length: 32, nullable: true })
  latestVersion?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => UserApp, (ua) => ua.app)
  userApps: UserApp[];
}
