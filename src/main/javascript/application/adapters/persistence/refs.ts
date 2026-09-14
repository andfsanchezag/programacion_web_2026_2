import { Customer } from '../../domain/models/Customer';
import { NaturalCustomer } from '../../domain/models/NaturalCustomer';
import { BankAccount } from '../../domain/models/BankAccount';
import { Loan } from '../../domain/models/Loan';
import { Transfer } from '../../domain/models/Transfer';
import { User } from '../../domain/models/User';
import { SystemRole } from '../../domain/valueobjects/SystemRole';
import { CustomerStatus } from '../../domain/valueobjects/CustomerStatus';
import { AccountType } from '../../domain/valueobjects/AccountType';
import { AccountStatus } from '../../domain/valueobjects/AccountStatus';
import { Currency } from '../../domain/valueobjects/Currency';
import { LoanType } from '../../domain/valueobjects/LoanType';

/**
 * Referencias de dominio válidas para búsquedas por puerto.
 * Los puertos exigen modelos de dominio (nunca IDs primitivos ni casts);
 * los servicios/adapters re-resuelven el estado autoritativo en DB a partir
 * del identificador, por lo que el resto de campos son solo contexto.
 */
export function lookupCustomer(identification: string): NaturalCustomer {
  return new NaturalCustomer(
    `lookup-${identification}`, identification, identification,
    `${identification}@lookup.local`, '0000000000', 'N/A',
    SystemRole.NATURAL_CUSTOMER, CustomerStatus.ACTIVE, new Date(), identification,
  );
}

export function accountRef(accountNumber: string, owner?: Customer): BankAccount {
  return new BankAccount(
    accountNumber, AccountType.SAVINGS, owner ?? lookupCustomer('lookup'),
    Currency.COP, new Date(), 0, AccountStatus.ACTIVE,
  );
}

export function loanRef(loanId: string): Loan {
  const owner = lookupCustomer('lookup');
  return new Loan(loanId, owner, LoanType.PERSONAL, 1, 0, 1, accountRef(`dst-${loanId}`, owner));
}

export function transferRef(transferId: string): Transfer {
  const owner = lookupCustomer('lookup');
  return new Transfer(
    transferId, accountRef(`src-${transferId}`, owner), accountRef(`dst-${transferId}`, owner),
    1, new Date(), User.forUsernameLookup('lookup'),
  );
}
