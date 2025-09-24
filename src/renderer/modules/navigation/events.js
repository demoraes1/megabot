// Eventos emitidos pelo processo principal relacionados a navegacao

export function initializeNavigationEvents() {
  if (
    !window.electronAPI ||
    typeof window.electronAPI.onBrowserNavigationComplete !== 'function'
  ) {
    console.warn('API de eventos de navegacao nao disponivel.');
    return;
  }

  window.electronAPI.onBrowserNavigationComplete((payload) => {
    console.log('[Navegacao] Navegacao concluida:', payload);
  });

  window.electronAPI.onBrowserNavigationInjection((payload) => {
    if (payload && payload.success) {
      console.log('[Navegacao] Injecao automatica finalizada:', payload);
    } else {
      console.warn('[Navegacao] Falha ou skip na injecao automatica:', payload);
    }
  });
}
