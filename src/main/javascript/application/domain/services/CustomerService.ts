import { NaturalCustomer } from '../models/NaturalCustomer';
import { BusinessCustomer } from '../models/BusinessCustomer';
import { Customer } from '../models/Customer';
import { User } from '../models/User';
import { BankingProduct } from '../models/BankingProduct';
import { SystemRole } from '../valueobjects/SystemRole';
import { CustomerStatus } from '../valueobjects/CustomerStatus';
import { CustomerRepositoryPort } from '../ports/out/CustomerRepositoryPort';
import { BankAccountRepositoryPort } from '../ports/out/BankAccountRepositoryPort';
import { LoanRepositoryPort } from '../ports/out/LoanRepositoryPort';
import { AuthorizationPort } from '../ports/out/AuthorizationPort';
import {
  RegisterNaturalCustomerUseCase,
} from '../ports/in/RegisterNaturalCustomerUseCase';
import { RegisterBusinessCustomerUseCase } from '../ports/in/RegisterBusinessCustomerUseCase';
import { ConsultCustomerUseCase } from '../ports/in/ConsultCustomerUseCase';
import { UpdateCustomerUseCase } from '../ports/in/UpdateCustomerUseCase';
import { ChangeCustomerStatusUseCase } from '../ports/in/ChangeCustomerStatusUseCase';
import { ConsultCustomerProductsUseCase } from '../ports/in/ConsultCustomerProductsUseCase';
import {
  CustomerAlreadyExistsException,
  CustomerNotFoundException,
  InvalidCustomerException,
  UnauthorizedCustomerOperationException,
  InvalidCustomerStatusException,
} from '../exceptions/customer-errors';

/**
 * CustomerService - Coordinates the business operations of the Customer
 * subdomain while preserving domain integrity.
 *
 * Depends only on Output Ports and never on infrastructure.
 */
export class CustomerService implements
  RegisterNaturalCustomerUseCase,
  RegisterBusinessCustomerUseCase,
  ConsultCustomerUseCase,
  UpdateCustomerUseCase,
  ChangeCustomerStatusUseCase,
  ConsultCustomerProductsUseCase {

  constructor(
    private readonly customerRepository: CustomerRepositoryPort,
    private readonly bankAccountRepository: BankAccountRepositoryPort,
    private readonly loanRepository: LoanRepositoryPort,
    private readonly authorizationPort: AuthorizationPort
  ) {}

  registerNaturalCustomer(customer: NaturalCustomer): NaturalCustomer {
    customer.validateRegistration();
    this.ensureDoesNotExist(customer);
    const saved = this.customerRepository.save(customer);
    return saved as NaturalCustomer;
  }

  registerBusinessCustomer(customer: BusinessCustomer): BusinessCustomer {
    customer.validateRegistration();
    this.ensureDoesNotExist(customer);
    const saved = this.customerRepository.save(customer);
    return saved as BusinessCustomer;
  }

  consult(requestingUser: User, customer: Customer): Customer {
    this.assertCanAccessCustomer(requestingUser, customer);
    const found = this.customerRepository.findByIdentification(customer);
    if (found === null || found === undefined) {
      throw new CustomerNotFoundException('Customer not found');
    }
    return found;
  }

  update(requestingUser: User, customer: Customer): Customer {
    this.assertCanAccessCustomer(requestingUser, customer);
    this.assertExists(customer);
    this.customerRepository.update(customer);
    return customer;
  }

  changeStatus(requestingUser: User, customer: Customer): Customer {
    this.assertCanAccessCustomer(requestingUser, customer);
    this.assertExists(customer);
    if (!customer.status.isValid()) {
      throw new InvalidCustomerStatusException('Invalid customer status');
    }
    this.customerRepository.update(customer);
    return customer;
  }

  consultProducts(requestingUser: User, customer: Customer): BankingProduct[] {
    this.assertCanAccessCustomer(requestingUser, customer);
    this.assertExists(customer);
    const accounts = this.bankAccountRepository.findAllByOwner(customer);
    const loans = this.loanRepository.findAllByApplicant(customer);
    return [...accounts, ...loans];
  }

  private ensureDoesNotExist(customer: Customer): void {
    if (this.customerRepository.existsByIdentification(customer)) {
      throw new CustomerAlreadyExistsException(
        'A customer with this identification already exists'
      );
    }
    if (this.customerRepository.existsByEmail(customer)) {
      throw new CustomerAlreadyExistsException(
        'A customer with this email already exists'
      );
    }
  }

  private assertExists(customer: Customer): void {
    if (!this.customerRepository.existsByIdentification(customer)) {
      throw new CustomerNotFoundException('Customer not found');
    }
  }

  private assertCanAccessCustomer(requestingUser: User, customer: Customer): void {
    if (!this.authorizationPort.canAccessCustomer(requestingUser, customer)) {
      throw new UnauthorizedCustomerOperationException(
        'User is not authorized to access this customer'
      );
    }
  }
}