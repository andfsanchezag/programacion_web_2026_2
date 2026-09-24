/** MoneyAmount — formato currency/locale es-CO, estados positivo/zero/negativo. */
const FORMATTERS = new Map<string, Intl.NumberFormat>();

function formatterFor(currency: string): Intl.NumberFormat {
  const key = `${currency}-es-CO`;
  let fmt = FORMATTERS.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    FORMATTERS.set(key, fmt);
  }
  return fmt;
}

export function MoneyAmount({
  value,
  currency = 'COP',
  className,
}: {
  value: number;
  currency?: string;
  className?: string;
}) {
  const tone = value < 0 ? 'negative' : value === 0 ? 'zero' : '';
  const text = formatterFor(currency).format(value);
  return (
    <span className={`money ${tone} ${className ?? ''}`}>
      <span className="sr-only" style={{ position: 'absolute', left: '-9999px' }}>
        {value < 0 ? 'saldo negativo ' : value === 0 ? 'saldo cero ' : ''}
      </span>
      {text}
    </span>
  );
}
