import { User } from '../../models/User';
import { NaturalCustomer } from '../../models/NaturalCustomer';
import { BusinessCustomer } from '../../models/BusinessCustomer';
import { SystemRole } from '../../valueobjects/SystemRole';

/**
 * AuthenticationResult - Result of a successful authentication.
 * Domain contract: never carries the password.
 */
export interface AuthenticationResult {
  readonly token: string;
  readonly username: string;
  readonly role: SystemRole;
}

/**
 * Puerto público: login/logout/registro. Usa solo modelos de dominio;
 * el login devuelve el contrato de autenticación del dominio (sin password).
 */
export interface PublicAccessPort {
  login(user: User): Promise<AuthenticationResult>;
  logout(user: User): Promise<void>;
  registerNaturalCustomer(customer: NaturalCustomer): Promise<NaturalCustomer>;
  registerBusinessCustomer(customer: BusinessCustomer): Promise<BusinessCustomer>;
  registerCustomerUser(user: User): Promise<User>;
}
