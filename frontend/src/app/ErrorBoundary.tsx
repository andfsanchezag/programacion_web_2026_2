/** ErrorBoundary — captura errores de render sin mostrar stack traces. */
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Sólo en consola del desarrollador; nunca se pinta en la UI.
    console.error('ErrorBoundary:', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="state-box" role="alert" style={{ margin: 'var(--space-8) auto', maxWidth: 520 }}>
          <div className="state-icon" aria-hidden="true">
            ⚠
          </div>
          <h1>Algo salió mal</h1>
          <p>La aplicación encontró un problema inesperado. Puedes recargar de forma segura.</p>
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            Recargar aplicación
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
