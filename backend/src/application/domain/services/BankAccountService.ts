import { BankAccount } from '../models/BankAccount';
import { User } from '../models/User';
import { Customer } from '../models/Customer';
import { Operation } from '../models/Operation';
import { AuditLog } from '../models/AuditLog';
import { OperationType } from '../valueobjects/OperationType';
import { BankAccountRepositoryPort } from '../ports/out/BankAccountRepositoryPort';
import { CustomerRepositoryPort } from '../ports/out/CustomerRepositoryPort';
import { OperationRepositoryPort } from '../ports/out/OperationRepositoryPort';
import { AuditLogRepositoryPort } from '../ports/out/AuditLogRepositoryPort';
import { AuthorizationPort } from '../ports/out/AuthorizationPort';
import {
  BankAccountNotFoundException,
  CustomerNotEligibleException,
} from '../exceptions/bank-account-errors';
import { InvalidAccountOwnershipException } from '../exceptions/bank-account-errors';
import { UnauthorizedCustomerOperationException } from '../exceptions/customer-errors';

/**
 * BankAccountService - Coordinates bank account business operations.
 */
export class BankAccountService {

  constructor(
    private readonly bankAccountRepository: BankAccountRepositoryPort,
    private readonly customerRepository: CustomerRepositoryPort,
    private readonly operationRepository: OperationRepositoryPort,
    private readonly auditRepository: AuditLogRepositoryPort,
    private readonly authorizationPort: AuthorizationPort
  ) {}

  async openAccount(requestingUser: User, bankAccount: BankAccount): Promise<BankAccount> {
    await this.assertOwnerEligible(bankAccount.owner);
    if (!this.authorizationPort.canExecute(requestingUser, bankAccount)) {
      throw new UnauthorizedCustomerOperationException(
        'User is not authorized to open this account'
      );
    }
    bankAccount.activate();
    const saved = await this.bankAccountRepository.save(bankAccount);
    await this.recordOperation(requestingUser, saved, OperationType.ACCOUNT_OPENING);
    return saved;
  }

  async consult(requestingUser: User, bankAccount: BankAccount): Promise<BankAccount> {
    await this.assertCanOperate(requestingUser, bankAccount);
    const found = await this.bankAccountRepository.find(bankAccount);
    if (found === null || found === undefined) {
      throw new BankAccountNotFoundException('Bank account not found');
    }
    return found;
  }

  async consultBalance(requestingUser: User, bankAccount: BankAccount): Promise<number> {
    const found = await this.consult(requestingUser, bankAccount);
    return found.currentBalance;
  }

  async deposit(requestingUser: User, bankAccount: BankAccount, amount: number): Promise<BankAccount> {
    await this.assertCanOperate(requestingUser, bankAccount);
    bankAccount.deposit(amount);
    await this.bankAccountRepository.update(bankAccount);
    await this.recordOperation(requestingUser, bankAccount, OperationType.DEPOSIT);
    return bankAccount;
  }

  async withdraw(requestingUser: User, bankAccount: BankAccount, amount: number): Promise<BankAccount> {
    await this.assertCanOperate(requestingUser, bankAccount);
    bankAccount.withdraw(amount);
    await this.bankAccountRepository.update(bankAccount);
    await this.recordOperation(requestingUser, bankAccount, OperationType.WITHDRAWAL);
    return bankAccount;
  }

  async block(requestingUser: User, bankAccount: BankAccount): Promise<BankAccount> {
    this.assertCanManage(requestingUser, bankAccount);
    bankAccount.block();
    await this.bankAccountRepository.update(bankAccount);
    await this.recordOperation(requestingUser, bankAccount, OperationType.ACCOUNT_BLOCKING);
    return bankAccount;
  }

  async unblock(requestingUser: User, bankAccount: BankAccount): Promise<BankAccount> {
    this.assertCanManage(requestingUser, bankAccount);
    bankAccount.unblock();
    await this.bankAccountRepository.update(bankAccount);
    await this.recordOperation(requestingUser, bankAccount, OperationType.ACCOUNT_UNBLOCKING);
    return bankAccount;
  }

  async close(requestingUser: User, bankAccount: BankAccount): Promise<BankAccount> {
    this.assertCanManage(requestingUser, bankAccount);
    bankAccount.close();
    await this.bankAccountRepository.update(bankAccount);
    await this.recordOperation(requestingUser, bankAccount, OperationType.ACCOUNT_CLOSING);
    return bankAccount;
  }

  private async assertOwnerEligible(owner: Customer): Promise<void> {
    const stored = await this.customerRepository.findByIdentification(owner);
    if (stored === null || stored === undefined || !stored.isOperational()) {
      throw new CustomerNotEligibleException(
        'The customer is not eligible to hold a bank account'
      );
    }
  }

  private async assertCanOperate(user: User, bankAccount: BankAccount): Promise<void> {
    await this.assertExists(bankAccount);
    if (!this.authorizationPort.canExecute(user, bankAccount)) {
      throw new UnauthorizedCustomerOperationException(
        'User is not authorized to operate this account'
      );
    }
  }

  private assertCanManage(user: User, bankAccount: BankAccount): void {
    if (!this.authorizationPort.canExecute(user, bankAccount)) {
      throw new UnauthorizedCustomerOperationException(
        'User is not authorized to manage this account'
      );
    }
  }

  private async assertExists(bankAccount: BankAccount): Promise<void> {
    if (!(await this.bankAccountRepository.exists(bankAccount))) {
      throw new BankAccountNotFoundException('Bank account not found');
    }
  }

  private async recordOperation(
    user: User,
    product: BankAccount,
    type: OperationType
  ): Promise<void> {
    const operation = new Operation(
      this.newId(),
      type,
      new Date(),
      user,
      product
    );
    await this.operationRepository.save(operation);
    const audit = new AuditLog(
      this.newId(),
      type,
      new Date(),
      user,
      product,
      new Map<string, unknown>()
    );
    await this.auditRepository.save(audit);
  }

  private newId(): string {
    return `id-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }
}
