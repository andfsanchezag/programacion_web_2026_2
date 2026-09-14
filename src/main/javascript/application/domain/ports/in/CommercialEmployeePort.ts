import { User } from '../../models/User';
import { Customer } from '../../models/Customer';
import { BankAccount } from '../../models/BankAccount';
import { Loan } from '../../models/Loan';
import { BankingProduct } from '../../models/BankingProduct';

/** COMMERCIAL_EMPLOYEE: onboarding comercial y asesoría de producto. */
export interface CommercialEmployeePort {
  consultCustomer(user: User, customer: Customer): Promise<Customer>;
  updateCustomer(user: User, customer: Customer): Promise<Customer>;
  consultCustomerProducts(user: User, customer: Customer): Promise<BankingProduct[]>;
  requestLoanOnBehalfOfCustomer(user: User, customer: Customer, loan: Loan): Promise<Loan>;
  consultLoanStatus(user: User, loan: Loan): Promise<Loan>;
  openBankAccount(user: User, account: BankAccount): Promise<BankAccount>;
}
