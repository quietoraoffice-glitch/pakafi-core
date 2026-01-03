import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppEntity } from './app.entity';
import { UserApp } from './user-app.entity';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { User } from '../users/user.entity';

@Injectable()
export class AppsService {
  constructor(
    @InjectRepository(AppEntity) private appsRepo: Repository<AppEntity>,
    @InjectRepository(UserApp) private userAppsRepo: Repository<UserApp>,
  ) {}

  private normalizeCode(code: string) {
    return code.trim().toUpperCase();
  }

  async heartbeat(user: User, dto: HeartbeatDto) {
    const appCode = this.normalizeCode(dto.appCode);

    if (!/^[A-Z0-9_]+$/.test(appCode)) {
      throw new BadRequestException('appCode invalide (A-Z0-9_)');
    }

    // 1) upsert app
    let app = await this.appsRepo.findOne({ where: { code: appCode } });

    if (!app) {
      app = this.appsRepo.create({
        code: appCode,
        name: dto.appName.trim(),
        latestVersion: dto.appVersion?.trim() ?? null,
        status: 'ACTIVE',
      });
      app = await this.appsRepo.save(app);
    } else {
      // update name/version if provided
      let changed = false;
      const newName = dto.appName.trim();
      if (newName && newName !== app.name) {
        app.name = newName;
        changed = true;
      }
      const newVer = dto.appVersion?.trim();
      if (newVer && newVer !== app.latestVersion) {
        app.latestVersion = newVer;
        changed = true;
      }
      if (changed) await this.appsRepo.save(app);
    }

    // 2) link user↔app
    let link = await this.userAppsRepo.findOne({
      where: { user: { id: user.id }, app: { id: app.id } },
      relations: ['user', 'app'],
    });

    if (!link) {
      link = this.userAppsRepo.create({
        user,
        app,
        launchCount: 1,
      });
      link = await this.userAppsRepo.save(link);
    } else {
      link.launchCount += 1;
      link = await this.userAppsRepo.save(link);
    }

    return {
      ok: true,
      app: { code: app.code, name: app.name, latestVersion: app.latestVersion, status: app.status },
      usage: { firstSeenAt: link.firstSeenAt, lastSeenAt: link.lastSeenAt, launchCount: link.launchCount },
    };
  }

  // OWNER: list apps with basic stats
  async ownerListApps() {
    const apps = await this.appsRepo.find({ order: { createdAt: 'DESC' } });

    // For each app: count users + lastSeen max
    const rows = await Promise.all(
      apps.map(async (a) => {
        const { userCount, lastSeenAt, totalLaunches } = await this.userAppsRepo
          .createQueryBuilder('ua')
          .select('COUNT(DISTINCT ua.userId)', 'userCount')
          .addSelect('MAX(ua.lastSeenAt)', 'lastSeenAt')
          .addSelect('SUM(ua.launchCount)', 'totalLaunches')
          .where('ua.appId = :appId', { appId: a.id })
          .getRawOne();

        return {
          code: a.code,
          name: a.name,
          status: a.status,
          latestVersion: a.latestVersion,
          createdAt: a.createdAt,
          userCount: Number(userCount ?? 0),
          totalLaunches: Number(totalLaunches ?? 0),
          lastSeenAt: lastSeenAt ?? null,
        };
      }),
    );

    return rows;
  }

  // OWNER: list users of an app
  async ownerAppUsers(appCode: string) {
    const code = this.normalizeCode(appCode);
    const app = await this.appsRepo.findOne({ where: { code } });
    if (!app) throw new BadRequestException('App inconnue');

    const links = await this.userAppsRepo.find({
      where: { app: { id: app.id } },
      relations: ['user', 'app'],
      order: { lastSeenAt: 'DESC' },
      take: 200,
    });

    return links.map((l) => ({
      userId: l.user.id,
      email: l.user.email,
      name: l.user.name,
      role: l.user.role,
      firstSeenAt: l.firstSeenAt,
      lastSeenAt: l.lastSeenAt,
      launchCount: l.launchCount,
    }));
  }
}
