import { User } from '../../models/User';
import { BusinessCustomer } from '../../models/BusinessCustomer';
import { BankAccount } from '../../models/BankAccount';
import { Loan } from '../../models/Loan';
import { Transfer } from '../../models/Transfer';
import { BankingProduct } from '../../models/BankingProduct';

/** BUSINESS_CUSTOMER: gestión corporativa del representante legal. */
export interface BusinessCustomerPort {
  consultCompanyProfile(user: User): Promise<BusinessCustomer>;
  consultCompanyProducts(user: User): Promise<BankingProduct[]>;
  registerCompanyUser(user: User, newCompanyUser: User): Promise<User>;
  consultCompanyAccounts(user: User): Promise<BankAccount[]>;
  requestCompanyLoan(user: User, customer: BusinessCustomer, loan: Loan): Promise<Loan>;
  approveCompanyTransfer(user: User, transfer: Transfer): Promise<Transfer>;
  rejectCompanyTransfer(user: User, transfer: Transfer): Promise<Transfer>;
}
