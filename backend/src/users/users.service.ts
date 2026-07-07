import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAllForOrg(orgId: string) {
    return this.prisma.user.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(orgId: string, id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(orgId: string, data: { name: string; email: string; password: string; role?: Role }) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        orgId,
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role ?? Role.TECHNICIAN,
      },
    });
  }

  async softDelete(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
