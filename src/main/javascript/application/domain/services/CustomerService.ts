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
 * Async: persistence goes to MySQL through CustomerRepositoryPort.
 */
export class CustomerService {

  constructor(
    private readonly customerRepository: CustomerRepositoryPort,
    private readonly bankAccountRepository: BankAccountRepositoryPort,
    private readonly loanRepository: LoanRepositoryPort,
    private readonly authorizationPort: AuthorizationPort
  ) {}

  async registerNaturalCustomer(customer: NaturalCustomer): Promise<NaturalCustomer> {
    customer.validateRegistration();
    await this.ensureDoesNotExist(customer);
    const saved = await this.customerRepository.save(customer);
    return saved as NaturalCustomer;
  }

  async registerBusinessCustomer(customer: BusinessCustomer): Promise<BusinessCustomer> {
    customer.validateRegistration();
    await this.ensureDoesNotExist(customer);
    const saved = await this.customerRepository.save(customer);
    return saved as BusinessCustomer;
  }

  async consult(requestingUser: User, customer: Customer): Promise<Customer> {
    this.assertCanAccessCustomer(requestingUser, customer);
    const found = await this.customerRepository.findByIdentification(customer);
    if (found === null || found === undefined) {
      throw new CustomerNotFoundException('Customer not found');
    }
    return found;
  }

  async update(requestingUser: User, customer: Customer): Promise<Customer> {
    this.assertCanAccessCustomer(requestingUser, customer);
    await this.assertExists(customer);
    await this.customerRepository.update(customer);
    return customer;
  }

  async changeStatus(requestingUser: User, customer: Customer): Promise<Customer> {
    this.assertCanAccessCustomer(requestingUser, customer);
    await this.assertExists(customer);
    if (!customer.status.isValid()) {
      throw new InvalidCustomerStatusException('Invalid customer status');
    }
    await this.customerRepository.update(customer);
    return customer;
  }

  async consultProducts(requestingUser: User, customer: Customer): Promise<BankingProduct[]> {
    this.assertCanAccessCustomer(requestingUser, customer);
    await this.assertExists(customer);
    const accounts = await this.bankAccountRepository.findAllByOwner(customer);
    const loans = await this.loanRepository.findAllByApplicant(customer);
    return [...accounts, ...loans];
  }

  private async ensureDoesNotExist(customer: Customer): Promise<void> {
    if (await this.customerRepository.existsByIdentification(customer)) {
      throw new CustomerAlreadyExistsException(
        'A customer with this identification already exists'
      );
    }
    if (await this.customerRepository.existsByEmail(customer)) {
      throw new CustomerAlreadyExistsException(
        'A customer with this email already exists'
      );
    }
  }

  private async assertExists(customer: Customer): Promise<void> {
    if (!(await this.customerRepository.existsByIdentification(customer))) {
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
