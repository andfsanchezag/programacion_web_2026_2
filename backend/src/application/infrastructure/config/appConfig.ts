import { BusinessConfigurationPort } from '../../domain/ports/out/BusinessConfigurationPort';

/** Configuración de negocio externa (umbral de aprobación y expiración). */
export class BusinessConfigurationAdapter implements BusinessConfigurationPort {
  constructor(
    private readonly threshold: number = Number(process.env.TRANSFER_APPROVAL_THRESHOLD ?? 10000000),
    private readonly expirationHours: number = Number(process.env.TRANSFER_APPROVAL_EXPIRATION_HOURS ?? 24),
  ) {}
  getTransferApprovalThreshold(): number { return this.threshold; }
  getTransferApprovalExpirationHours(): number { return this.expirationHours; }
}

export const appConfig = {
  port: Number(process.env.PORT ?? 8080),
  mysql: {
    host: process.env.MYSQL_HOST ?? 'localhost',
    port: Number(process.env.MYSQL_PORT ?? 3306),
    database: process.env.MYSQL_DATABASE ?? 'bank_db',
    user: process.env.MYSQL_USER ?? 'root',
    password: process.env.MYSQL_PASSWORD ?? 'root_password',
  },
  mongoUri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/audit_db',
};
