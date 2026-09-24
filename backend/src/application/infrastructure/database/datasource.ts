import { DataSource } from 'typeorm';
import { appConfig } from '../config/appConfig';
import { ALL_SCHEMAS } from '../../adapters/persistence/typeorm/schemas';

/** DataSource MySQL 3306 con auto-generación de esquema (`synchronize: true`). */
export function createMysqlDataSource(): DataSource {
  return new DataSource({
    type: 'mysql',
    host: appConfig.mysql.host,
    port: appConfig.mysql.port,
    username: appConfig.mysql.user,
    password: appConfig.mysql.password,
    database: appConfig.mysql.database,
    synchronize: true,
    logging: false,
    entities: ALL_SCHEMAS,
    extra: { connectTimeout: 3000 },
  });
}
