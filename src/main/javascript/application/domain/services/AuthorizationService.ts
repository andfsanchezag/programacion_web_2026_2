import { User } from '../models/User';
import { Customer } from '../models/Customer';
import { BankingProduct } from '../models/BankingProduct';
import { BankAccount } from '../models/BankAccount';
import { Loan } from '../models/Loan';
import { Transfer } from '../models/Transfer';
import { SystemRole } from '../valueobjects/SystemRole';

/**
 * AuthorizationService - Contains the domain authorization rules.
 *
 * Authorization determines whether an authenticated User may perform a business
 * operation according to the user's SystemRole and status.
 */
export class AuthorizationService {

  hasPermission(user: User): boolean {
    if (user === null || user === undefined || !user.status.isValid()) {
      return false;
    }
    return user.canAuthenticate();
  }

  canAccessCustomer(actor: User, customer: Customer): boolean {
    if (!this.hasPermission(actor)) {
      return false;
    }
    if (actor.role.isEmployeeRole()) {
      return true;
    }
    return this.isActorCustomer(actor, customer);
  }

  canAccessProduct(actor: User, product: BankingProduct): boolean {
    if (!this.hasPermission(actor)) {
      return false;
    }
    if (actor.role.isEmployeeRole()) {
      return true;
    }
    return this.isActorOwner(actor, product);
  }

  canExecute(actor: User, product: BankingProduct): boolean {
    if (!this.hasPermission(actor)) {
      return false;
    }
    if (product instanceof Loan || product instanceof Transfer) {
      return this.isAuthorizeOperatorOrOwner(actor, product);
    }
    return this.isEmployee(actor) || this.isActorOwner(actor, product);
  }

  canApprove(actor: User, product: BankingProduct): boolean {
    if (!this.hasPermission(actor)) {
      return false;
    }
    if (product instanceof Loan) {
      return actor.role.canApproveLoans();
    }
    if (product instanceof Transfer) {
      return actor.role.canApproveBusinessTransfers();
    }
    return false;
  }

  canApproveApproval(actor: User): boolean {
    if (!this.hasPermission(actor)) {
      return false;
    }
    return actor.role.equals(SystemRole.BUSINESS_SUPERVISOR) ||
      actor.role.equals(SystemRole.INTERNAL_ANALYST);
  }

  private isActorCustomer(actor: User, customer: Customer): boolean {
    return actor.customer !== null &&
      actor.customer !== undefined &&
      actor.customer.customerId === customer.customerId;
  }

  private isActorOwner(actor: User, product: BankingProduct): boolean {
    if (product instanceof BankAccount) {
      return this.isActorCustomer(actor, product.owner);
    }
    if (product instanceof Loan) {
      return this.isActorCustomer(actor, product.applicant);
    }
    if (product instanceof Transfer) {
      return this.isActorCustomer(actor, product.sourceAccount.owner);
    }
    return false;
  }

  private isEmployee(actor: User): boolean {
    return actor.role.isEmployeeRole();
  }

  private isAuthorizeOperator(actor: User): boolean {
    return actor.role.equals(SystemRole.BUSINESS_OPERATOR);
  }

  private isAuthorizeOperatorOrOwner(actor: User, product: BankingProduct): boolean {
    return this.isAuthorizeOperator(actor) || this.isActorOwner(actor, product);
  }
}