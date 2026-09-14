import { User } from '../../models/User';
import { Customer } from '../../models/Customer';
import { BankAccount } from '../../models/BankAccount';
import { Loan } from '../../models/Loan';
import { Transfer } from '../../models/Transfer';
import { Operation } from '../../models/Operation';
import { BankingProduct } from '../../models/BankingProduct';

/** NATURAL_CUSTOMER: operaciones sobre sus propias cuentas, préstamos y transferencias. */
export interface NaturalCustomerPort {
  consultMyProfile(user: User): Promise<Customer>;
  updateMyProfile(user: User, customer: Customer): Promise<Customer>;
  consultMyProducts(user: User): Promise<BankingProduct[]>;
  consultMyAccounts(user: User): Promise<BankAccount[]>;
  consultAccountBalance(user: User, account: BankAccount): Promise<number>;
  requestLoan(user: User, customer: Customer, loan: Loan): Promise<Loan>;
  consultLoan(user: User, loan: Loan): Promise<Loan>;
  registerLoanPayment(user: User, loan: Loan): Promise<Loan>;
  createTransfer(user: User, transfer: Transfer): Promise<Transfer>;
  executeTransfer(user: User, transfer: Transfer): Promise<Transfer>;
  consultMyOperations(user: User, product: BankingProduct): Promise<Operation[]>;
}
