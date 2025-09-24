export function showNotification(message, type = 'info', duration = 4000) {
  const existingNotification = document.getElementById('custom-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement('div');
  notification.id = 'custom-notification';
  notification.className =
    'fixed top-4 right-4 z-[9999] px-4 py-3 rounded-lg shadow-lg transform translate-x-full transition-all duration-300 ease-in-out max-w-sm';

  const typeClasses = {
    success: 'bg-green-600 text-white border-l-4 border-green-400',
    error: 'bg-red-600 text-white border-l-4 border-red-400',
    info: 'bg-blue-600 text-white border-l-4 border-blue-400',
    warning: 'bg-yellow-600 text-white border-l-4 border-yellow-400',
  };

  notification.className += ` ${typeClasses[type] || typeClasses.info}`;

  const icons = {
    success: '[] ',
    error: '[] ',
    info: '[i] ',
    warning: '[!] ',
  };

  notification.innerHTML = `
    <div class="flex items-center space-x-2">
      <span class="text-lg font-bold">${icons[type] || icons.info}</span>
      <span class="text-sm font-medium">${message}</span>
    </div>
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.remove('translate-x-full');
    notification.classList.add('translate-x-0');
  }, 100);

  setTimeout(() => {
    notification.classList.remove('translate-x-0');
    notification.classList.add('translate-x-full');

    setTimeout(() => {
      notification.remove();
    }, 300);
  }, duration);
}

export function showCustomConfirm(message, onConfirm, onCancel = null) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px;';

    const modal = document.createElement('div');
    modal.className =
      'bg-gray-900 border border-gray-600 rounded-lg p-6 max-w-md w-full shadow-2xl';
    modal.style.cssText =
      'background: rgba(31, 41, 55, 0.95); backdrop-filter: blur(10px); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);';

    modal.innerHTML = `
      <div class="mb-4">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-8 h-8 bg-yellow-800 rounded-full flex items-center justify-center">
            <span class="text-yellow-300 text-lg">!</span>
          </div>
          <h3 class="text-white font-semibold text-lg">Confirmacao</h3>
        </div>
        <p class="text-gray-300 text-sm leading-relaxed">${message}</p>
      </div>
      <div class="flex gap-3 justify-end">
        <button id="cancel-btn" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm font-medium transition-colors">
          Cancelar
        </button>
        <button id="confirm-btn" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors">
          Confirmar
        </button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const confirmBtn = modal.querySelector('#confirm-btn');
    const cancelBtn = modal.querySelector('#cancel-btn');

    const cleanup = () => {
      document.removeEventListener('keydown', handleKeydown);
      overlay.remove();
    };

    const resolveConfirm = () => {
      cleanup();
      resolve(true);
      onConfirm?.();
    };

    const resolveCancel = () => {
      cleanup();
      resolve(false);
      onCancel?.();
    };

    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        resolveCancel();
      } else if (event.key === 'Enter') {
        resolveConfirm();
      }
    };

    confirmBtn?.addEventListener('click', resolveConfirm);
    cancelBtn?.addEventListener('click', resolveCancel);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        resolveCancel();
      }
    });
    document.addEventListener('keydown', handleKeydown);
    modal.addEventListener('click', (event) => {
      event.stopPropagation();
    });
  });
}
