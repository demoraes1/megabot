// Eventos emitidos pelo processo principal relacionados à navegação

export function initializeNavigationEvents() {
  if (
    !window.electronAPI ||
    typeof window.electronAPI.onBrowserNavigationComplete !== 'function'
  ) {
    console.warn('API de eventos de navegação não disponível.');
    return;
  }

  window.electronAPI.onBrowserNavigationComplete((payload) => {
    console.log('[Navegação] Navegação concluída:', payload);
  });

  window.electronAPI.onBrowserNavigationInjection((payload) => {
    if (payload && payload.success) {
      console.log('[Navegação] Injeção automática finalizada:', payload);
    } else {
      console.warn('[Navegação] Falha ou skip na injeção automática:', payload);
    }
  });
}
