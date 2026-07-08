import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { publicUserSelect } from '../users/user-select.util';

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  findAllForOrg(orgId: string) {
    return this.prisma.job.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { lastModified: 'desc' },
      include: { assignee: { select: publicUserSelect } },
    });
  }

  async findOne(orgId: string, id: string) {
    const job = await this.prisma.job.findFirst({
      where: { id, orgId, deletedAt: null },
      include: { assignee: { select: publicUserSelect } },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  create(orgId: string, dto: CreateJobDto) {
    return this.prisma.job.create({
      data: {
        orgId,
        title: dto.title,
        description: dto.description,
        status: dto.status,
        assignedTo: dto.assignedTo,
        locationLat: dto.locationLat,
        locationLng: dto.locationLng,
      },
    });
  }

  async update(orgId: string, id: string, dto: UpdateJobDto) {
    await this.findOne(orgId, id);
    return this.prisma.job.update({
      where: { id },
      data: {
        ...dto,
        lastModified: new Date(),
      },
    });
  }

  async softDelete(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.job.update({
      where: { id },
      data: { deletedAt: new Date(), lastModified: new Date() },
    });
  }
}
