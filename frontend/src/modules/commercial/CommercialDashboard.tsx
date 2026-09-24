/** Comercial — solicitud de crédito con identificación directa (§F5). */
import { useState } from 'react';
import { Button } from '../../components';
import { CommercialLoanForm } from './CommercialLoanForm';

export function CommercialDashboard() {
  const [identification, setIdentification] = useState('');
  const [activeIdentification, setActiveIdentification] = useState<string | null>(null);
  const [identificationError, setIdentificationError] = useState<string | null>(null);

  // REPAIR_BACKEND pendiente: el backend no expone búsqueda de clientes para
  // COMMERCIAL_EMPLOYEE (sólo POST /commercial/loans). El flujo opera con
  // identificación directa; el backend valida existencia (404) al solicitar.
  const useIdentification = (): void => {
    if (!identification.trim()) { setIdentificationError('Ingresa la identificación del cliente.'); return; }
    setIdentificationError(null);
    setActiveIdentification(identification.trim());
  };

  return (
    <div>
      <div className="page-head"><h1>Cartera comercial</h1></div>

      <section className="card section" aria-label="Cliente para solicitar crédito">
        <h2>Cliente para solicitar crédito</h2>
        <div className="field">
          <label htmlFor="comm-search">Identificación</label>
          <input id="comm-search" value={identification} onChange={(e) => setIdentification(e.target.value)} placeholder="Ej. 1017123456" />
          <Button onClick={useIdentification}>Continuar</Button>
        </div>
        {identificationError && <div className="alert alert-error" role="alert">{identificationError}</div>}
      </section>

      {activeIdentification && <CommercialLoanForm key={activeIdentification} customerIdentification={activeIdentification} />}
    </div>
  );
}