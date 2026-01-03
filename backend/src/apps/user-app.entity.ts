import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { AppEntity } from './app.entity';

@Entity('user_apps')
@Index(['user', 'app'], { unique: true })
export class UserApp {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (u: User) => u.userApps, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => AppEntity, (a) => a.userApps, { onDelete: 'CASCADE' })
  app: AppEntity;

  @CreateDateColumn()
  firstSeenAt: Date;

  @UpdateDateColumn()
  lastSeenAt: Date;

  @Column({ type: 'int', default: 0 })
  launchCount: number;
}
