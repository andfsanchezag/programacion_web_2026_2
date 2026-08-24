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
import { OpenBankAccountUseCase } from '../ports/in/OpenBankAccountUseCase';
import { ConsultBankAccountUseCase } from '../ports/in/ConsultBankAccountUseCase';
import { ConsultBalanceUseCase } from '../ports/in/ConsultBalanceUseCase';
import { DepositFundsUseCase } from '../ports/in/DepositFundsUseCase';
import { WithdrawFundsUseCase } from '../ports/in/WithdrawFundsUseCase';
import { BlockAccountUseCase } from '../ports/in/BlockAccountUseCase';
import { UnblockAccountUseCase } from '../ports/in/UnblockAccountUseCase';
import { CloseAccountUseCase } from '../ports/in/CloseAccountUseCase';
import {
  BankAccountNotFoundException,
  CustomerNotEligibleException,
} from '../exceptions/bank-account-errors';
import { InvalidAccountOwnershipException } from '../exceptions/bank-account-errors';
import { UnauthorizedCustomerOperationException } from '../exceptions/customer-errors';

/**
 * BankAccountService - Coordinates bank account business operations.
 */
export class BankAccountService implements
  OpenBankAccountUseCase,
  ConsultBankAccountUseCase,
  ConsultBalanceUseCase,
  DepositFundsUseCase,
  WithdrawFundsUseCase,
  BlockAccountUseCase,
  UnblockAccountUseCase,
  CloseAccountUseCase {

  constructor(
    private readonly bankAccountRepository: BankAccountRepositoryPort,
    private readonly customerRepository: CustomerRepositoryPort,
    private readonly operationRepository: OperationRepositoryPort,
    private readonly auditRepository: AuditLogRepositoryPort,
    private readonly authorizationPort: AuthorizationPort
  ) {}

  openAccount(requestingUser: User, bankAccount: BankAccount): BankAccount {
    this.assertOwnerEligible(bankAccount.owner);
    if (!this.authorizationPort.canExecute(requestingUser, bankAccount)) {
      throw new UnauthorizedCustomerOperationException(
        'User is not authorized to open this account'
      );
    }
    bankAccount.activate();
    const saved = this.bankAccountRepository.save(bankAccount);
    this.recordOperation(requestingUser, saved, OperationType.ACCOUNT_OPENING);
    return saved;
  }

  consult(requestingUser: User, bankAccount: BankAccount): BankAccount {
    this.assertCanOperate(requestingUser, bankAccount);
    const found = this.bankAccountRepository.find(bankAccount);
    if (found === null || found === undefined) {
      throw new BankAccountNotFoundException('Bank account not found');
    }
    return found;
  }

  consultBalance(requestingUser: User, bankAccount: BankAccount): number {
    const found = this.consult(requestingUser, bankAccount);
    return found.currentBalance;
  }

  deposit(requestingUser: User, bankAccount: BankAccount, amount: number): BankAccount {
    this.assertCanOperate(requestingUser, bankAccount);
    bankAccount.deposit(amount);
    this.bankAccountRepository.update(bankAccount);
    this.recordOperation(requestingUser, bankAccount, OperationType.DEPOSIT);
    return bankAccount;
  }

  withdraw(requestingUser: User, bankAccount: BankAccount, amount: number): BankAccount {
    this.assertCanOperate(requestingUser, bankAccount);
    bankAccount.withdraw(amount);
    this.bankAccountRepository.update(bankAccount);
    this.recordOperation(requestingUser, bankAccount, OperationType.WITHDRAWAL);
    return bankAccount;
  }

  block(requestingUser: User, bankAccount: BankAccount): BankAccount {
    this.assertCanManage(requestingUser, bankAccount);
    bankAccount.block();
    this.bankAccountRepository.update(bankAccount);
    this.recordOperation(requestingUser, bankAccount, OperationType.ACCOUNT_BLOCKING);
    return bankAccount;
  }

  unblock(requestingUser: User, bankAccount: BankAccount): BankAccount {
    this.assertCanManage(requestingUser, bankAccount);
    bankAccount.unblock();
    this.bankAccountRepository.update(bankAccount);
    this.recordOperation(requestingUser, bankAccount, OperationType.ACCOUNT_UNBLOCKING);
    return bankAccount;
  }

  close(requestingUser: User, bankAccount: BankAccount): BankAccount {
    this.assertCanManage(requestingUser, bankAccount);
    bankAccount.close();
    this.bankAccountRepository.update(bankAccount);
    this.recordOperation(requestingUser, bankAccount, OperationType.ACCOUNT_CLOSING);
    return bankAccount;
  }

  private assertOwnerEligible(owner: Customer): void {
    const stored = this.customerRepository.findByIdentification(owner);
    if (stored === null || stored === undefined || !stored.isOperational()) {
      throw new CustomerNotEligibleException(
        'The customer is not eligible to hold a bank account'
      );
    }
  }

  private assertCanOperate(user: User, bankAccount: BankAccount): void {
    this.assertExists(bankAccount);
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

  private assertExists(bankAccount: BankAccount): void {
    if (!this.bankAccountRepository.exists(bankAccount)) {
      throw new BankAccountNotFoundException('Bank account not found');
    }
  }

  private recordOperation(
    user: User,
    product: BankAccount,
    type: OperationType
  ): void {
    const operation = new Operation(
      this.newId(),
      type,
      new Date(),
      user,
      product
    );
    this.operationRepository.save(operation);
    const audit = new AuditLog(
      this.newId(),
      type,
      new Date(),
      user,
      product,
      new Map<string, unknown>()
    );
    this.auditRepository.save(audit);
  }

  private newId(): string {
    return `id-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }
}