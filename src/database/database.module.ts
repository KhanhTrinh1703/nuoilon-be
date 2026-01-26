import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl: string | undefined =
          configService.get('database.url');

        // Cloud mode: Use DATABASE_URL with SSL (NeonDB)
        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            ssl: {
              rejectUnauthorized: false,
            },
            entities: [__dirname + '/../**/*.entity{.ts,.js}'],
            synchronize: configService.get('database.synchronize'),
            logging: configService.get('database.logging'),
            migrations: configService.get('database.migrations'),
            migrationsRun: configService.get('database.migrationsRun'),
          };
        }

        // Local mode: Use individual parameters without SSL
        return {
          type: 'postgres',
          host: configService.get('database.host'),
          port: configService.get('database.port'),
          username: configService.get('database.username'),
          password: configService.get('database.password'),
          database: configService.get('database.database'),
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          // entities: [__dirname + '/entities/*.entity{.ts,.js}'],
          synchronize: configService.get('database.synchronize'),
          logging: configService.get('database.logging'),
          migrations: configService.get('database.migrations'),
          migrationsRun: configService.get('database.migrationsRun'),
        };
      },
    }),
  ],
})
export class DatabaseModule {}
