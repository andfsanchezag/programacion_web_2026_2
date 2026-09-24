import { PublicAccessPort } from '../../domain/ports/in/PublicAccessPort';
import { User } from '../../domain/models/User';
import { NaturalCustomer } from '../../domain/models/NaturalCustomer';
import { BusinessCustomer } from '../../domain/models/BusinessCustomer';
import { AuthenticationResult } from '../../domain/ports/in/PublicAccessPort';
import { UserAuthenticationService } from '../../domain/services/UserAuthenticationService';
import { CustomerService } from '../../domain/services/CustomerService';

/** Implementa PublicAccessPort inyectando servicios de dominio con las reglas de negocio. */
export class PublicAccessUseCaseImpl implements PublicAccessPort {
  constructor(
    private readonly authService: UserAuthenticationService,
    private readonly customerService: CustomerService,
  ) {}
  async login(user: User): Promise<AuthenticationResult> {
    return this.authService.login(user);
  }
  async logout(user: User): Promise<void> { await this.authService.logout(user); }
  async registerNaturalCustomer(c: NaturalCustomer): Promise<NaturalCustomer> {
    return this.customerService.registerNaturalCustomer(c);
  }
  async registerBusinessCustomer(c: BusinessCustomer): Promise<BusinessCustomer> {
    return this.customerService.registerBusinessCustomer(c);
  }
  async registerCustomerUser(u: User): Promise<User> { return this.authService.registerCustomerUser(u); }
}
