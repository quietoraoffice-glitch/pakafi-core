import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async createWithPassword(
    email: string,
    passwordHash: string,
    name?: string,
    role: UserRole = 'USER',
  ): Promise<User> {
    const user = this.usersRepo.create({ email, name, passwordHash, role });
    return this.usersRepo.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepo.find();
  }

  async findOne(id: number): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  async findOwner(): Promise<User | null> {
    return this.usersRepo.findOne({ where: { role: 'OWNER' } });
  }

  async save(user: User): Promise<User> {
    return this.usersRepo.save(user);
  }
}
