import { Repository } from 'typeorm';
import { BankAccount } from '../../../domain/models/BankAccount';
import { Customer } from '../../../domain/models/Customer';
import { NaturalCustomer } from '../../../domain/models/NaturalCustomer';
import { User } from '../../../domain/models/User';
import { Loan } from '../../../domain/models/Loan';
import { Transfer } from '../../../domain/models/Transfer';
import { Operation } from '../../../domain/models/Operation';
import { BankingProduct } from '../../../domain/models/BankingProduct';
import { BankAccountRepositoryPort } from '../../../domain/ports/out/BankAccountRepositoryPort';
import { CustomerRepositoryPort } from '../../../domain/ports/out/CustomerRepositoryPort';
import { UserRepositoryPort } from '../../../domain/ports/out/UserRepositoryPort';
import { LoanRepositoryPort } from '../../../domain/ports/out/LoanRepositoryPort';
import { TransferRepositoryPort } from '../../../domain/ports/out/TransferRepositoryPort';
import { OperationRepositoryPort } from '../../../domain/ports/out/OperationRepositoryPort';
import { OperationType } from '../../../domain/valueobjects/OperationType';
import {
  BankAccountTypeOrmMapper, CustomerTypeOrmMapper, UserTypeOrmMapper,
  LoanTypeOrmMapper, TransferTypeOrmMapper, OperationTypeOrmMapper,
} from './mappers/mappers';
import { BankAccountRow, CustomerRow, UserRow, LoanRow, TransferRow, OperationRow } from './schemas';
import { lookupCustomer, accountRef, loanRef, transferRef } from '../refs';

/**
 * Adaptadores relacionales puros (MySQL 3306 vía TypeORM).
 * Sin estado en memoria: cada operación va a la base de datos.
 * La reconstrucción de agregados relacionados se resuelve vía Output Ports
 * (regla de parámetros por modelo de dominio).
 */
const num = (v: number | string): number => (typeof v === 'number' ? v : Number(v));

export class CustomerTypeOrmAdapter implements CustomerRepositoryPort {
  constructor(private readonly repo: Repository<any>) {}
  async save(c: Customer): Promise<Customer> {
    await this.repo.save(CustomerTypeOrmMapper.toEntity(c));
    const found = await this.findByIdentification(c);
    if (!found) throw new Error(`Customer ${c.identification} not persisted`);
    return found;
  }
  async findByIdentification(c: Customer): Promise<Customer | null> {
    const row: CustomerRow | null = await this.repo.findOne({ where: { identification: c.identification } });
    if (!row) return null;
    if (row.customerKind === 'BUSINESS') {
      const rep = await this.findByIdentification(lookupCustomer(row.legalRepresentativeIdentification ?? ''));
      if (!(rep instanceof NaturalCustomer)) return null;
      return CustomerTypeOrmMapper.toDomain(row as never, rep);
    }
    return CustomerTypeOrmMapper.toDomain(row as never);
  }
  async findByEmail(c: Customer): Promise<Customer | null> {
    const row: CustomerRow | null = await this.repo.findOne({ where: { email: c.email } });
    if (!row) return null;
    return this.findByIdentification(lookupCustomer(row.identification));
  }
  async existsByIdentification(c: Customer): Promise<boolean> {
    return (await this.repo.count({ where: { identification: c.identification } })) > 0;
  }
  async existsByEmail(c: Customer): Promise<boolean> {
    return (await this.repo.count({ where: { email: c.email } })) > 0;
  }
  async findAll(): Promise<Customer[]> {
    const rows: CustomerRow[] = await this.repo.find();
    const out: Customer[] = [];
    for (const row of rows) {
      const c = await this.findByIdentification(lookupCustomer(row.identification));
      if (c) out.push(c);
    }
    return out;
  }
  async update(c: Customer): Promise<void> {
    await this.repo.save(CustomerTypeOrmMapper.toEntity(c));
  }
}

export class UserTypeOrmAdapter implements UserRepositoryPort {
  constructor(private readonly repo: Repository<any>, private readonly customers: CustomerRepositoryPort) {}
  async save(u: User): Promise<User> {
    await this.repo.save(UserTypeOrmMapper.toEntity(u));
    const found = await this.findByUsername(u);
    if (!found) throw new Error(`User ${u.username} not persisted`);
    return found;
  }
  async findByUsername(u: User): Promise<User | null> {
    const row: UserRow | null = await this.repo.findOne({ where: { username: u.username } });
    if (!row) return null;
    const customer = row.customerIdentification
      ? await this.customers.findByIdentification(lookupCustomer(row.customerIdentification))
      : null;
    return UserTypeOrmMapper.toDomain(row as never, customer);
  }
  async findById(u: User): Promise<User | null> {
    const row: UserRow | null = await this.repo.findOne({ where: { userId: u.userId } });
    if (!row) return null;
    return this.findByUsername(User.forUsernameLookup(row.username));
  }
  async existsByUsername(u: User): Promise<boolean> {
    return (await this.repo.count({ where: { username: u.username } })) > 0;
  }
  async update(u: User): Promise<void> {
    await this.repo.save(UserTypeOrmMapper.toEntity(u));
  }
}

export class BankAccountTypeOrmAdapter implements BankAccountRepositoryPort {
  constructor(private readonly repo: Repository<any>, private readonly customers: CustomerRepositoryPort) {}
  async save(a: BankAccount): Promise<BankAccount> {
    await this.repo.save(BankAccountTypeOrmMapper.toEntity(a));
    const found = await this.find(a);
    if (!found) throw new Error(`BankAccount ${a.identifier} not persisted`);
    return found;
  }
  async find(a: BankAccount): Promise<BankAccount | null> {
    const row: BankAccountRow | null = await this.repo.findOne({ where: { accountNumber: a.identifier } });
    if (!row) return null;
    const owner = await this.customers.findByIdentification(lookupCustomer(row.customerIdentification));
    if (!owner) throw new Error(`Owner ${row.customerIdentification} of account ${row.accountNumber} not found`);
    return BankAccountTypeOrmMapper.toDomain({ ...row, balance: num(row.balance) } as never, owner);
  }
  async exists(a: BankAccount): Promise<boolean> {
    return (await this.repo.count({ where: { accountNumber: a.identifier } })) > 0;
  }
  async update(a: BankAccount): Promise<void> {
    await this.repo.save(BankAccountTypeOrmMapper.toEntity(a));
  }
  async findAllByOwner(owner: Customer): Promise<BankAccount[]> {
    const rows: BankAccountRow[] = await this.repo.find({ where: { customerIdentification: owner.identification } });
    const out: BankAccount[] = [];
    for (const row of rows) {
      const full = await this.find(accountRef(row.accountNumber));
      if (full) out.push(full);
    }
    return out;
  }
}

export class LoanTypeOrmAdapter implements LoanRepositoryPort {
  constructor(
    private readonly repo: Repository<any>,
    private readonly customers: CustomerRepositoryPort,
    private readonly accounts: BankAccountRepositoryPort,
  ) {}
  private async toDomain(row: LoanRow): Promise<Loan | null> {
    const applicant = await this.customers.findByIdentification(lookupCustomer(row.applicantIdentification));
    const dest = await this.accounts.find(accountRef(row.destinationAccountNumber));
    if (!applicant || !dest) return null;
    return LoanTypeOrmMapper.toDomain({
      ...row, requestedAmount: num(row.requestedAmount),
      approvedAmount: num(row.approvedAmount), interestRate: num(row.interestRate),
    } as never, applicant, dest);
  }
  async save(l: Loan): Promise<Loan> {
    await this.repo.save(LoanTypeOrmMapper.toEntity(l));
    const found = await this.find(l);
    if (!found) throw new Error(`Loan ${l.identifier} not persisted`);
    return found;
  }
  async find(l: Loan): Promise<Loan | null> {
    const row: LoanRow | null = await this.repo.findOne({ where: { loanId: l.identifier } });
    if (!row) return null;
    const full = await this.toDomain(row);
    if (!full) throw new Error(`Loan ${row.loanId} references missing applicant/account`);
    return full;
  }
  async exists(l: Loan): Promise<boolean> {
    return (await this.repo.count({ where: { loanId: l.identifier } })) > 0;
  }
  async update(l: Loan): Promise<void> {
    await this.repo.save(LoanTypeOrmMapper.toEntity(l));
  }
  async findAllByApplicant(applicant: Customer): Promise<Loan[]> {
    const rows: LoanRow[] = await this.repo.find({ where: { applicantIdentification: applicant.identification } });
    const out: Loan[] = [];
    for (const row of rows) {
      const full = await this.toDomain(row);
      if (full) out.push(full);
    }
    return out;
  }
}

export class TransferTypeOrmAdapter implements TransferRepositoryPort {
  constructor(
    private readonly repo: Repository<any>,
    private readonly accounts: BankAccountRepositoryPort,
    private readonly users: UserRepositoryPort,
  ) {}
  async toDomain(row: TransferRow): Promise<Transfer | null> {
    const src = await this.accounts.find(accountRef(row.sourceAccountNumber));
    const dst = await this.accounts.find(accountRef(row.destinationAccountNumber));
    const createdBy = await this.users.findByUsername(User.forUsernameLookup(row.createdByUsername));
    if (!src || !dst || !createdBy) return null;
    const approvedBy = row.approvedByUsername
      ? await this.users.findByUsername(User.forUsernameLookup(row.approvedByUsername))
      : null;
    return TransferTypeOrmMapper.toDomain({ ...row, amount: num(row.amount) } as never, src, dst, createdBy, approvedBy);
  }
  async save(t: Transfer): Promise<Transfer> {
    await this.repo.save(TransferTypeOrmMapper.toEntity(t));
    const found = await this.find(t);
    if (!found) throw new Error(`Transfer ${t.identifier} not persisted`);
    return found;
  }
  async find(t: Transfer): Promise<Transfer | null> {
    const row: TransferRow | null = await this.repo.findOne({ where: { transferId: t.identifier } });
    if (!row) return null;
    const full = await this.toDomain(row);
    if (!full) throw new Error(`Transfer ${row.transferId} references missing accounts/users`);
    return full;
  }
  async exists(t: Transfer): Promise<boolean> {
    return (await this.repo.count({ where: { transferId: t.identifier } })) > 0;
  }
  async update(t: Transfer): Promise<void> {
    await this.repo.save(TransferTypeOrmMapper.toEntity(t));
  }
  async findAll(): Promise<Transfer[]> {
    const rows: TransferRow[] = await this.repo.find();
    const out: Transfer[] = [];
    for (const row of rows) {
      const full = await this.toDomain(row);
      if (full) out.push(full);
    }
    return out;
  }
}

export class OperationTypeOrmAdapter implements OperationRepositoryPort {
  constructor(
    private readonly repo: Repository<any>,
    private readonly users: UserRepositoryPort,
    private readonly accounts: BankAccountRepositoryPort,
    private readonly loans: LoanRepositoryPort,
    private readonly transfers: TransferRepositoryPort,
  ) {}
  async findProduct(identifier: string): Promise<BankingProduct | null> {
    return (await this.accounts.find(accountRef(identifier)))
      ?? (await this.loans.find(loanRef(identifier)))
      ?? (await this.transfers.find(transferRef(identifier)));
  }
  private async toDomain(row: OperationRow): Promise<Operation | null> {
    const user = await this.users.findByUsername(User.forUsernameLookup(row.performedByUsername));
    const product = await this.findProduct(row.affectedProductIdentifier);
    if (!user || !product) return null;
    return new Operation(row.operationId, OperationType.fromCode(row.operationType), new Date(row.executionDate), user, product);
  }
  async save(o: Operation): Promise<Operation> {
    await this.repo.save(OperationTypeOrmMapper.toEntity(o));
    const found = await this.find(o);
    if (!found) throw new Error(`Operation ${o.operationId} not persisted`);
    return found;
  }
  async find(o: Operation): Promise<Operation | null> {
    const row: OperationRow | null = await this.repo.findOne({ where: { operationId: o.operationId } });
    if (!row) return null;
    return this.toDomain(row);
  }
  async findByProduct(p: BankingProduct): Promise<Operation[]> {
    const rows: OperationRow[] = await this.repo.find({ where: { affectedProductIdentifier: p.identifier } });
    const out: Operation[] = [];
    for (const row of rows) {
      const full = await this.toDomain(row);
      if (full) out.push(full);
    }
    return out;
  }
  async exists(o: Operation): Promise<boolean> {
    return (await this.repo.count({ where: { operationId: o.operationId } })) > 0;
  }
  async findAll(): Promise<Operation[]> {
    const rows: OperationRow[] = await this.repo.find();
    const out: Operation[] = [];
    for (const row of rows) {
      const full = await this.toDomain(row);
      if (full) out.push(full);
    }
    return out;
  }
}

export type { CustomerRow, UserRow, BankAccountRow, LoanRow, TransferRow, OperationRow };
