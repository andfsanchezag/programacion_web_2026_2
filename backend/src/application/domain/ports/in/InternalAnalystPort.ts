import { User } from '../../models/User';
import { Customer } from '../../models/Customer';
import { Loan } from '../../models/Loan';
import { Operation } from '../../models/Operation';
import { AuditLog } from '../../models/AuditLog';
import { BankingProduct } from '../../models/BankingProduct';

/** INTERNAL_ANALYST: riesgo, préstamos, usuarios internos y auditoría. */
export interface InternalAnalystPort {
  registerEmployeeUser(user: User, newEmployee: User): Promise<User>;
  changeCustomerStatus(user: User, customer: Customer): Promise<Customer>;
  changeUserStatus(user: User, targetUser: User): Promise<User>;
  approveLoan(user: User, loan: Loan): Promise<Loan>;
  rejectLoan(user: User, loan: Loan): Promise<Loan>;
  disburseLoan(user: User, loan: Loan): Promise<Loan>;
  closeLoan(user: User, loan: Loan): Promise<Loan>;
  consultAuditLog(user: User, product: BankingProduct): Promise<AuditLog[]>;
  consultAllOperations(user: User, product: BankingProduct): Promise<Operation[]>;
}
