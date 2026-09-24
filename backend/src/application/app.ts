import { CustomerService } from './domain/services/CustomerService';
import { UserAuthenticationService } from './domain/services/UserAuthenticationService';
import { BankAccountService } from './domain/services/BankAccountService';
import { LoanService } from './domain/services/LoanService';
import { TransferService } from './domain/services/TransferService';
import { OperationAuditService } from './domain/services/OperationAuditService';
import { AuthorizationService } from './domain/services/AuthorizationService';
import { CustomerRepositoryPort } from './domain/ports/out/CustomerRepositoryPort';
import { UserRepositoryPort } from './domain/ports/out/UserRepositoryPort';
import { BankAccountRepositoryPort } from './domain/ports/out/BankAccountRepositoryPort';
import { LoanRepositoryPort } from './domain/ports/out/LoanRepositoryPort';
import { TransferRepositoryPort } from './domain/ports/out/TransferRepositoryPort';
import { OperationRepositoryPort } from './domain/ports/out/OperationRepositoryPort';
import { AuditLogRepositoryPort } from './domain/ports/out/AuditLogRepositoryPort';
import { JwtProvider } from './infrastructure/security/JwtProvider';
import { PasswordSecurityAdapter } from './infrastructure/security/PasswordSecurityAdapter';
import { JwtAuthMiddleware } from './infrastructure/security/JwtAuthMiddleware';
import { BusinessConfigurationAdapter } from './infrastructure/config/appConfig';
import { PublicAccessUseCaseImpl } from './adapters/useCases/PublicAccessUseCaseImpl';
import { NaturalCustomerUseCaseImpl } from './adapters/useCases/NaturalCustomerUseCaseImpl';
import { BusinessCustomerUseCaseImpl } from './adapters/useCases/BusinessCustomerUseCaseImpl';
import { BusinessOperatorUseCaseImpl } from './adapters/useCases/BusinessOperatorUseCaseImpl';
import { BusinessSupervisorUseCaseImpl } from './adapters/useCases/BusinessSupervisorUseCaseImpl';
import { TellerEmployeeUseCaseImpl } from './adapters/useCases/TellerEmployeeUseCaseImpl';
import { CommercialEmployeeUseCaseImpl } from './adapters/useCases/CommercialEmployeeUseCaseImpl';
import { InternalAnalystUseCaseImpl } from './adapters/useCases/InternalAnalystUseCaseImpl';
import { AuthController, NaturalCustomerController, BusinessCustomerController, BusinessOperatorController, BusinessSupervisorController, TellerController, CommercialController, InternalAnalystController } from './adapters/rest/controllers/controllers';

export interface AppRepositories {
  customers: CustomerRepositoryPort; users: UserRepositoryPort; accounts: BankAccountRepositoryPort;
  loans: LoanRepositoryPort; transfers: TransferRepositoryPort;
  operations: OperationRepositoryPort; audits: AuditLogRepositoryPort;
}

/** Composición raíz hexagonal: dominio ← puertos ← adapters MySQL/Mongo + seguridad. */
export function createApp(deps: {
  jwtSecret?: string; jwtExpiresIn?: number; approvalThreshold?: number; approvalExpirationHours?: number;
  repositories: AppRepositories;
}) {
  const { customers, users, accounts, loans, transfers, operations, audits } = deps.repositories;

  const jwt = new JwtProvider(deps.jwtSecret ?? 'test-secret', deps.jwtExpiresIn ?? 3600);
  const passwords = new PasswordSecurityAdapter();
  const config = new BusinessConfigurationAdapter(deps.approvalThreshold ?? 10000000, deps.approvalExpirationHours ?? 24);
  // Nota: los servicios exigen AuthorizationPort; AuthorizationService del dominio lo implementa.
  const authz = new AuthorizationService();
  const customerService = new CustomerService(customers, accounts, loans, authz);
  const authService = new UserAuthenticationService(users, passwords, jwt);
  const accountService = new BankAccountService(accounts, customers, operations, audits, authz);
  const loanService = new LoanService(loans, customers, accounts, operations, audits, authz);
  const transferService = new TransferService(transfers, accounts, operations, audits, authz, config);
  const auditService = new OperationAuditService(operations, audits);

  const publicAccess = new PublicAccessUseCaseImpl(authService, customerService);
  const natural = new NaturalCustomerUseCaseImpl(customerService, accountService, loanService, transferService, auditService);
  const businessCustomer = new BusinessCustomerUseCaseImpl(customerService, accountService, loanService, transferService, authService);
  const businessOperator = new BusinessOperatorUseCaseImpl(customerService, transferService, auditService);
  const businessSupervisor = new BusinessSupervisorUseCaseImpl(transferService, auditService, transfers);
  const teller = new TellerEmployeeUseCaseImpl(customerService, accountService);
  const commercial = new CommercialEmployeeUseCaseImpl(customerService, accountService, loanService);
  const analyst = new InternalAnalystUseCaseImpl(authService, customerService, loanService, auditService);

  const middleware = new JwtAuthMiddleware(jwt);
  const controllers = {
    auth: new AuthController(publicAccess),
    natural: new NaturalCustomerController(natural),
    businessCustomer: new BusinessCustomerController(businessCustomer),
    businessOperator: new BusinessOperatorController(businessOperator),
    businessSupervisor: new BusinessSupervisorController(businessSupervisor),
    teller: new TellerController(teller),
    commercial: new CommercialController(commercial),
    analyst: new InternalAnalystController(analyst),
  };

  return {
    repositories: { customers, users, accounts, loans, transfers, operations, audits },
    services: { customerService, authService, accountService, loanService, transferService, auditService },
    useCases: { publicAccess, natural, businessCustomer, businessOperator, businessSupervisor, teller, commercial, analyst },
    controllers, middleware, jwt, passwords, config,
  };
}

export type App = ReturnType<typeof createApp>;
