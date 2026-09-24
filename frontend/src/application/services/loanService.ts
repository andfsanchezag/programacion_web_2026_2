/**
 * LoanService (Frontend-Domain-Services.md §2, mapeo en Frontend-Adapters.md).
 */

import type { HttpPort } from '../../domain/ports';
import type { LoanPaymentResult, LoanSummary } from '../../domain/models';
import { mapLoan, mapLoanPayment } from '../../adapters/mappers/responseMappers';

export interface RequestLoanInput {
  loanType: string;
  requestedAmount: number;
  termInMonths: number;
  destinationAccountNumber: string;
}

export interface CommercialRequestLoanInput extends RequestLoanInput {
  customerIdentification: string;
}

export function createLoanService(http: HttpPort) {
  return {
    requestLoan: (data: RequestLoanInput): Promise<LoanSummary> =>
      http
        .request<unknown>({ method: 'POST', path: '/api/v1/natural-customer/loans', body: data })
        .then(mapLoan),

    /** COMMERCIAL_EMPLOYEE: POST /commercial/loans (fila 100). */
    requestLoanForCustomer: (data: CommercialRequestLoanInput): Promise<LoanSummary> =>
      http
        .request<unknown>({ method: 'POST', path: '/api/v1/commercial/loans', body: data })
        .then(mapLoan),

    getLoan: (loanId: string): Promise<LoanSummary> =>
      http
        .request<unknown>({
          method: 'GET',
          path: `/api/v1/natural-customer/loans/${encodeURIComponent(loanId)}`,
        })
        .then(mapLoan),

    registerPayment: (
      loanId: string,
      data: { sourceAccountNumber: string; amount: number },
    ): Promise<LoanPaymentResult> =>
      http
        .request<unknown>({
          method: 'POST',
          path: `/api/v1/natural-customer/loans/${encodeURIComponent(loanId)}/payments`,
          body: data,
        })
        .then(mapLoanPayment),

    approveLoan: (loanId: string, data: { approvedAmount: number; interestRate: number }): Promise<LoanSummary> =>
      http
        .request<unknown>({
          method: 'PATCH',
          path: `/api/v1/internal-analyst/loans/${encodeURIComponent(loanId)}/approve`,
          body: data,
        })
        .then(mapLoan),

    rejectLoan: (loanId: string): Promise<LoanSummary> =>
      http
        .request<unknown>({
          method: 'PATCH',
          path: `/api/v1/internal-analyst/loans/${encodeURIComponent(loanId)}/reject`,
        })
        .then(mapLoan),

    disburseLoan: (loanId: string): Promise<LoanSummary> =>
      http
        .request<unknown>({
          method: 'POST',
          path: `/api/v1/internal-analyst/loans/${encodeURIComponent(loanId)}/disburse`,
        })
        .then(mapLoan),

    /** DELETE devuelve 204 sin cuerpo: cierre de dominio, no borrado físico. */
    closeLoan: async (loanId: string): Promise<void> => {
      await http.request<void>({
        method: 'DELETE',
        path: `/api/v1/internal-analyst/loans/${encodeURIComponent(loanId)}`,
      });
    },
  };
}

export type LoanService = ReturnType<typeof createLoanService>;
