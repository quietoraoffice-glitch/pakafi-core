import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppEntity } from './app.entity';
import { UserApp } from './user-app.entity';
import { HeartbeatDto } from './dto/heartbeat.dto';

@Injectable()
export class AppsService {
  constructor(
    @InjectRepository(AppEntity) private readonly appsRepo: Repository<AppEntity>,
    @InjectRepository(UserApp) private readonly userAppsRepo: Repository<UserApp>,
  ) { }

  private normalizeCode(code: string) {
    return code.trim().toUpperCase();
  }

  /**
   * IMPORTANT:
   * on passe userId (depuis JWT payload sub) au lieu d'attendre un User entity.
   */
  async heartbeat(userId: number, dto: HeartbeatDto) {
    if (!userId || Number.isNaN(Number(userId))) {
      throw new BadRequestException('Utilisateur manquant (auth requise)');
    }

    const appCode = this.normalizeCode(dto.appCode);

    if (!/^[A-Z0-9_]+$/.test(appCode)) {
      throw new BadRequestException('appCode invalide (A-Z0-9_)');
    }

    const now = new Date();

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
      let changed = false;

      const newName = dto.appName?.trim();
      if (newName && newName !== app.name) {
        app.name = newName;
        changed = true;
      }

      const newVer = dto.appVersion?.trim();
      if (newVer && newVer !== app.latestVersion) {
        app.latestVersion = newVer;
        changed = true;
      }

      if (changed) {
        app = await this.appsRepo.save(app);
      }
    }

    // 2) link user↔app
    // On force un lien avec userId réel via "user: {id: userId}" (TypeORM accepte)
    let link = await this.userAppsRepo.findOne({
      where: {
        user: { id: userId },
        app: { id: app.id },
      },
      relations: { user: true, app: true },
    });

    if (!link) {
      link = this.userAppsRepo.create({
        user: { id: userId } as any, // 👈 important
        app,
        launchCount: 1,
      });
    } else {
      link.launchCount = (link.launchCount ?? 0) + 1;
    }

    link = await this.userAppsRepo.save(link);


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
        // Ignore les lignes corrompues (userId NULL)
        const raw = await this.userAppsRepo
          .createQueryBuilder('ua')
          .select('COUNT(DISTINCT ua.userId)', 'userCount')
          .addSelect('MAX(ua.lastSeenAt)', 'lastSeenAt')
          .addSelect('SUM(ua.launchCount)', 'totalLaunches')
          .where('ua.appId = :appId', { appId: a.id })
          .andWhere('ua.userId IS NOT NULL')
          .getRawOne();

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
    const code = appCode.trim().toUpperCase();

    const app = await this.appsRepo.findOne({ where: { code } });
    if (!app) {
      return {
        code,
        name: null,
        userCount: 0,
        users: [],
      };
    }

    const links = await this.userAppsRepo
      .createQueryBuilder('ua')
      .innerJoinAndSelect('ua.user', 'user') // ✅ filtre user NULL
      .innerJoin('ua.app', 'app')
      .where('app.code = :code', { code })
      .orderBy('ua.lastSeenAt', 'DESC')
      .limit(200)
      .getMany();

    const users = links.map((ua) => ({
      userId: ua.user.id,
      email: ua.user.email,
      name: ua.user.name,
      role: ua.user.role,
      firstSeenAt: ua.firstSeenAt,
      lastSeenAt: ua.lastSeenAt,
      launchCount: ua.launchCount,
    }));

    return {
      code: app.code,
      name: app.name,
      userCount: users.length,
      users,
    };
  }


  // OWNER: cleanup lignes corrompues (userId NULL)
  async ownerCleanupNullUserApps() {
    const res = await this.userAppsRepo
      .createQueryBuilder()
      .delete()
      .from(UserApp)
      .where('"userId" IS NULL')
      .execute();

    return { deleted: res.affected ?? 0 };
  }
}
