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
    @InjectRepository(AppEntity) private readonly appsRepo: Repository<AppEntity>,
    @InjectRepository(UserApp) private readonly userAppsRepo: Repository<UserApp>,
  ) {}

  private normalizeCode(code: string) {
    return code.trim().toUpperCase();
  }

  async heartbeat(user: User, dto: HeartbeatDto) {
    const now = new Date();

    const appCode = this.normalizeCode(dto.appCode);
    if (!/^[A-Z0-9_]+$/.test(appCode)) {
      throw new BadRequestException('appCode invalide (A-Z0-9_)');
    }

    const appName = (dto.appName ?? '').trim();
    if (!appName) throw new BadRequestException('appName est requis');

    const appVersion = (dto.appVersion ?? '').trim();
    const latestVersion = appVersion.length ? appVersion : null;

    // 1) Upsert App (SANS lastSeenAt)
    let app = await this.appsRepo.findOne({ where: { code: appCode } });

    if (!app) {
      const createdApp: AppEntity = this.appsRepo.create({
        code: appCode,
        name: appName,
        latestVersion,
        status: 'ACTIVE',
      } as Partial<AppEntity>);
      app = await this.appsRepo.save(createdApp);
    } else {
      let changed = false;

      if (appName !== app.name) {
        app.name = appName;
        changed = true;
      }

      if (latestVersion && latestVersion !== app.latestVersion) {
        app.latestVersion = latestVersion;
        changed = true;
      }

      if (changed) {
        app = await this.appsRepo.save(app);
      }
    }

    // app est maintenant NON-NULL
    // 2) Upsert link user↔app
    let link = await this.userAppsRepo.findOne({
      where: { user: { id: user.id }, app: { id: app.id } },
      relations: ['user', 'app'],
    });

    if (!link) {
      const createdLink: UserApp = this.userAppsRepo.create({
        user,
        app,
        launchCount: 1,
        firstSeenAt: now,
        lastSeenAt: now,
      } as Partial<UserApp>);

      link = await this.userAppsRepo.save(createdLink);
    } else {
      link.launchCount = (link.launchCount ?? 0) + 1;
      link.lastSeenAt = now;
      if (!link.firstSeenAt) link.firstSeenAt = now;

      link = await this.userAppsRepo.save(link);
    }

    return {
      ok: true,
      app: {
        code: app.code,
        name: app.name,
        latestVersion: app.latestVersion,
        status: app.status,
      },
      usage: {
        firstSeenAt: link.firstSeenAt ?? null,
        lastSeenAt: link.lastSeenAt ?? null,
        launchCount: link.launchCount ?? 0,
      },
    };
  }

  // OWNER: list apps with basic stats
  async ownerListApps() {
    const apps = await this.appsRepo.find({ order: { createdAt: 'DESC' } });

    const rows = await Promise.all(
      apps.map(async (a) => {
        const raw = await this.userAppsRepo
          .createQueryBuilder('ua')
          .select('COUNT(DISTINCT ua.userId)', 'userCount')
          .addSelect('MAX(ua.lastSeenAt)', 'lastSeenAt')
          .addSelect('SUM(ua.launchCount)', 'totalLaunches')
          .where('ua.appId = :appId', { appId: a.id })
          .getRawOne<{
            userCount: string | null;
            lastSeenAt: string | null;
            totalLaunches: string | null;
          }>();

        return {
          code: a.code,
          name: a.name,
          status: a.status,
          latestVersion: a.latestVersion,
          createdAt: a.createdAt,
          userCount: Number(raw?.userCount ?? 0),
          totalLaunches: Number(raw?.totalLaunches ?? 0),
          lastSeenAt: raw?.lastSeenAt ?? null,
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

    return {
      code: app.code,
      name: app.name,
      userCount: links.length,
      users: links.map((l) => ({
        userId: l.user.id,
        email: l.user.email,
        name: l.user.name,
        role: l.user.role,
        firstSeenAt: l.firstSeenAt ?? null,
        lastSeenAt: l.lastSeenAt ?? null,
        launchCount: l.launchCount ?? 0,
      })),
    };
  }
}
