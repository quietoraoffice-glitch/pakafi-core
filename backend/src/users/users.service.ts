import { Injectable } from '@nestjs/common';

export interface User {
  id: number;
  email: string;
  name?: string;
}

@Injectable()
export class UsersService {
  private users: User[] = [];
  private nextId = 1;

  create(email: string, name?: string): User {
    const user: User = {
      id: this.nextId++,
      email,
      name,
    };
    this.users.push(user);
    return user;
  }

  findAll(): User[] {
    return this.users;
  }

  findOne(id: number): User | undefined {
    return this.users.find((u) => u.id === id);
  }
}
