import { addNewLinkInput, updateCriarContasButton } from './link-inputs.js';
import { updateProxyCount } from './proxies.js';
import { updatePixCount } from './pix.js';
import { setExtensions, updateExtensionCount } from './extensions.js';

function loadLinks(links = []) {
  const linksContainer = document.getElementById('links-container');
  if (!linksContainer) return;

  linksContainer.innerHTML = '';

  links.forEach((link) => {
    addNewLinkInput();
    const inputs = linksContainer.querySelectorAll('input[type="text"]');
    const lastInput = inputs[inputs.length - 1];
    if (lastInput) {
      lastInput.value = link;
    }
  });

  updateCriarContasButton();
}

function loadProxies(proxies = []) {
  if (!proxies || proxies.length === 0) return;

  const proxyList = document.getElementById('proxy-list');
  if (proxyList) {
    proxyList.value = proxies.join('\n');
  }

  const proxyListPopup = document.getElementById('proxy-list-popup');
  if (proxyListPopup) {
    proxyListPopup.value = proxies.join('\n');
  }

  updateProxyCount();
}

function loadRotatingProxies(rotatingProxies = []) {
  if (!rotatingProxies || rotatingProxies.length === 0) return;

  const rotatingProxy = rotatingProxies[0];

  const rotatingProxyList = document.getElementById('rotating-proxy-list');
  if (rotatingProxyList) {
    rotatingProxyList.value = rotatingProxy;
  }

  const rotatingProxyListPopup = document.getElementById('rotating-proxy-list-popup');
  if (rotatingProxyListPopup) {
    rotatingProxyListPopup.value = rotatingProxy;
  }
}

function loadPixKeys(pixKeys = []) {
  const pixListPopup = document.getElementById('pix-list-popup');
  if (!pixListPopup) return;

  if (pixKeys.length > 0) {
    const keysToDisplay = pixKeys.map((key) => {
      if (typeof key === 'object' && key && key.chave) {
        return key.chave;
      }
      return key;
    });

    pixListPopup.value = keysToDisplay.join('\n');
  } else {
    pixListPopup.value = '';
  }

  updatePixCount();
}

function loadExtensions(extensions = []) {
  setExtensions(Array.isArray(extensions) ? extensions : []);
  updateExtensionCount();
}

export {
  loadLinks,
  loadProxies,
  loadRotatingProxies,
  loadPixKeys,
  loadExtensions,
};
