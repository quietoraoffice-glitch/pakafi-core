import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export type UserRole = 'OWNER' | 'ADMIN' | 'USER';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'varchar', default: 'USER' })
  role: UserRole;
}
