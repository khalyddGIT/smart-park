import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[SmartPark ErrorBoundary] Error atrapado:', error, errorInfo);
  }

  handleReload = () => {
    window.location.href = '/app/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-900 text-white">
          <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto text-2xl font-bold">
              !
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-black text-white">Ocurrió un error inesperado</h2>
              <p className="text-xs text-slate-400">
                La aplicación encontró una excepción al renderizar la vista.
              </p>
            </div>
            {this.state.error?.message && (
              <div className="p-3 bg-slate-900 rounded-xl text-left border border-slate-800 overflow-x-auto">
                <span className="text-[10px] text-slate-500 font-mono uppercase block font-bold">Detalle técnico:</span>
                <code className="text-xs text-rose-400 font-mono break-all">{this.state.error.message}</code>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
              >
                Recargar página
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-md cursor-pointer"
              >
                Ir a Inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
