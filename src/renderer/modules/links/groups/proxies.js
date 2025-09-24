import { showNotification, showCustomConfirm } from '../../ui/notifications.js';
import { debouncedSave } from '../../settings/autosave.js';

function getAddedProxies() {
  const proxies = [];
  const proxyList = document.getElementById('proxy-list');

  if (proxyList && proxyList.value.trim() !== '') {
    const listProxies = proxyList.value
      .split('\n')
      .filter((proxy) => proxy.trim() !== '');
    proxies.push(...listProxies);
  }

  const proxyListPopup = document.getElementById('proxy-list-popup');
  if (proxyListPopup && proxyListPopup.value.trim() !== '') {
    const listProxies = proxyListPopup.value
      .split('\n')
      .filter((proxy) => proxy.trim() !== '');
    proxies.push(...listProxies);
  }

  return [...new Set(proxies.map((proxy) => proxy.trim()))];
}

function consumeProxy(proxyToRemove) {
  if (!proxyToRemove) return;

  console.log('Consumindo proxy:', proxyToRemove);

  const proxyList = document.getElementById('proxy-list');
  if (proxyList && proxyList.value.includes(proxyToRemove)) {
    const proxies = proxyList.value
      .split('\n')
      .filter((proxy) => proxy.trim() !== proxyToRemove.trim());
    proxyList.value = proxies.join('\n');
  }

  const proxyListPopup = document.getElementById('proxy-list-popup');
  if (proxyListPopup && proxyListPopup.value.includes(proxyToRemove)) {
    const proxies = proxyListPopup.value
      .split('\n')
      .filter((proxy) => proxy.trim() !== proxyToRemove.trim());
    proxyListPopup.value = proxies.join('\n');
  }

  updateProxyCount();
  debouncedSave();

  console.log('Proxy consumido e removido da lista:', proxyToRemove);
}

function getNextAvailableProxy() {
  const proxies = getAddedProxies();
  return proxies.length > 0 ? proxies[0] : null;
}

function getAndConsumeNextProxy() {
  const proxy = getNextAvailableProxy();
  if (proxy) {
    consumeProxy(proxy);
  }
  return proxy;
}

function getRotatingProxy() {
  const rotatingProxyList = document.getElementById('rotating-proxy-list');
  const rotatingProxyListPopup = document.getElementById('rotating-proxy-list-popup');

  const activeRotatingField =
    rotatingProxyListPopup && rotatingProxyListPopup.value.trim()
      ? rotatingProxyListPopup
      : rotatingProxyList;

  if (activeRotatingField && activeRotatingField.value.trim()) {
    return activeRotatingField.value.trim();
  }

  return null;
}

function updateProxyCount() {
  let totalProxies = 0;
  const proxyList = document.getElementById('proxy-list');
  const proxyListPopup = document.getElementById('proxy-list-popup');
  const activeProxyList =
    proxyListPopup && proxyListPopup.value ? proxyListPopup : proxyList;

  if (activeProxyList && activeProxyList.value.trim()) {
    const normalProxies = activeProxyList.value
      .trim()
      .split('\n')
      .filter((proxy) => proxy.trim() !== '');
    totalProxies += normalProxies.length;
  }

  const proxyCounter = document.getElementById('proxy-counter-text');
  if (proxyCounter) {
    proxyCounter.textContent = `${totalProxies} proxies restantes`;
  }
}

function initializeProxyManagement() {
  const proxyList = document.getElementById('proxy-list');
  const rotatingProxyList = document.getElementById('rotating-proxy-list');
  const proxyListPopup = document.getElementById('proxy-list-popup');
  const rotatingProxyListPopup = document.getElementById('rotating-proxy-list-popup');
  const clearProxiesBtn = document.getElementById('clear-proxies-btn');

  function syncMainToPopup() {
    if (proxyList && proxyListPopup) {
      proxyListPopup.value = proxyList.value;
    }

    if (rotatingProxyList && rotatingProxyListPopup) {
      rotatingProxyListPopup.value = rotatingProxyList.value;
    }
  }

  function syncPopupToMain() {
    if (proxyListPopup && proxyList) {
      proxyList.value = proxyListPopup.value;
    }

    if (rotatingProxyListPopup && rotatingProxyList) {
      rotatingProxyList.value = rotatingProxyListPopup.value;
    }

    updateProxyCount();
  }

  if (proxyList) {
    proxyList.addEventListener('input', () => {
      updateProxyCount();
      debouncedSave();
    });
  }

  if (rotatingProxyList) {
    rotatingProxyList.addEventListener('input', () => {
      updateProxyCount();
      debouncedSave();
    });
  }

  if (proxyListPopup) {
    proxyListPopup.addEventListener('input', () => {
      syncPopupToMain();
      updateProxyCount();
      debouncedSave();
    });
  }

  if (rotatingProxyListPopup) {
    rotatingProxyListPopup.addEventListener('input', () => {
      syncPopupToMain();
      updateProxyCount();
      debouncedSave();
    });
  }

  if (clearProxiesBtn) {
    clearProxiesBtn.addEventListener('click', async () => {
      const confirmed = await showCustomConfirm(
        'Tem certeza que deseja limpar todos os proxies?',
      );

      if (!confirmed) {
        return;
      }

      if (proxyListPopup) proxyListPopup.value = '';
      if (rotatingProxyListPopup) rotatingProxyListPopup.value = '';

      syncPopupToMain();
      debouncedSave();
      showNotification('Proxies limpos com sucesso!', 'success');
    });
  }

  const proxyPopupOverlay = document.getElementById('proxy-popup-overlay');
  if (proxyPopupOverlay) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (proxyPopupOverlay.classList.contains('opacity-100')) {
            syncMainToPopup();
          }
        }
      });
    });

    observer.observe(proxyPopupOverlay, { attributes: true });
  }

  updateProxyCount();
}

export {
  getAddedProxies,
  consumeProxy,
  getNextAvailableProxy,
  getAndConsumeNextProxy,
  getRotatingProxy,
  updateProxyCount,
  initializeProxyManagement,
};
