import { state, updateDefaults } from '../state.js';

const collectors = {
  getLinks: () => [],
  getProxies: () => [],
  getRotatingProxy: () => null,
  getPixKeys: () => [],
  getExtensions: () => [],
  getToggleStates: () => ({}),
};

const loaders = {
  loadLinks: () => {},
  loadProxies: () => {},
  loadRotatingProxies: () => {},
  loadPixKeys: () => {},
  loadExtensions: () => {},
  updatePixCount: () => {},
  updateExtensionCount: () => {},
  updateProxyCount: () => {},
  applyToggleStates: () => {},
  applySelectedMonitor: () => {},
};

export function registerSettingsCollectors(overrides = {}) {
  Object.assign(collectors, overrides);
}

export function registerSettingsLoaders(overrides = {}) {
  Object.assign(loaders, overrides);
}

export function mapPixKeyTypeToFile(interfaceValue) {
  const mapping = {
    telefone: 'PHONE',
    aleatoria: 'EVP',
    cpf: 'CPF',
    cnpj: 'CNPJ',
    email: 'EMAIL',
  };
  return mapping[interfaceValue] || interfaceValue?.toUpperCase?.() || 'CPF';
}

export function mapPixKeyTypeFromFile(fileValue) {
  const mapping = {
    PHONE: 'telefone',
    EVP: 'aleatoria',
    CPF: 'cpf',
    CNPJ: 'cnpj',
    EMAIL: 'email',
  };
  return mapping[fileValue] || fileValue?.toLowerCase?.() || 'cpf';
}

function buildAutomationSettings() {
  const delayCount = document.getElementById('delay-count');
  const depositMinInput = document.getElementById('deposit-min');
  const depositMaxInput = document.getElementById('deposit-max');

  return {
    muteAudio: document.getElementById('mute-audio-toggle')?.checked || false,
    depositMin: parseFloat(depositMinInput?.value || '0'),
    depositMax: parseFloat(depositMaxInput?.value || '0'),
    delayEnabled: document.getElementById('delay-toggle')?.checked || false,
    delaySeconds: parseInt(delayCount?.textContent || '5', 10),
    password: document.getElementById('password-field')?.value || '',
    withdrawPassword:
      document.getElementById('withdraw-password-field')?.value || '',
    randomPasswords:
      document.getElementById('random-passwords-toggle')?.checked || false,
    categoria: document.getElementById('categoria-field')?.value || 'slots',
    jogo: document.getElementById('jogo-field')?.value || '',
    pixKeyType: mapPixKeyTypeToFile(
      document.getElementById('pix-key-type')?.value || 'cpf',
    ),
    generateWithdraw:
      document.getElementById('generate-withdraw-toggle')?.checked || false,
  };
}

export function saveSettings() {
  const defaultCheckbox = document.getElementById(
    'default-resolution-checkbox',
  );
  const widthInput = document.getElementById('width-input');
  const heightInput = document.getElementById('height-input');

  const monitorIndex =
    state.monitors.selected && Array.isArray(state.monitors.detected)
      ? state.monitors.detected.findIndex(
          (monitor) => monitor && monitor.id === state.monitors.selected.id,
        )
      : -1;
  const selectedMonitorSetting =
    monitorIndex >= 0 ? monitorIndex.toString() : 'todos';

  const settings = {
    links: collectors.getLinks(),
    proxies: collectors.getProxies(),
    rotatingProxies: collectors.getRotatingProxy()
      ? [collectors.getRotatingProxy()]
      : [],
    pixKeys: collectors.getPixKeys(),
    extensions: collectors.getExtensions(),
    settings: {
      delay: parseInt(
        document.getElementById('delay-count')?.textContent || '5',
        10,
      ),
      openings: parseInt(
        document.getElementById('openings-count')?.textContent || '1',
        10,
      ),
      toggles: collectors.getToggleStates(),
      lastSaved: new Date().toISOString(),
    },
    resolution: {
      useDefault: defaultCheckbox?.checked ?? true,
      width: parseInt(widthInput?.value, 10) || state.defaults.width,
      height: parseInt(heightInput?.value, 10) || state.defaults.height,
    },
    automation: buildAutomationSettings(),
    selectedMonitor: selectedMonitorSetting,
  };

  try {
    if (window.electronAPI && window.electronAPI.saveSettings) {
      window.electronAPI.saveSettings(settings, true);
      console.log('Configurações salvas automaticamente:', settings);
    } else {
      localStorage.setItem('app-settings', JSON.stringify(settings, null, 2));
      console.log('Configurações salvas no localStorage (fallback):', settings);
    }
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
  }
}

export async function loadSettingsAsync() {
  try {
    if (window.electronAPI && window.electronAPI.loadSettings) {
      const settings = await window.electronAPI.loadSettings();
      if (settings) {
        applyLoadedSettings(settings);
        return settings;
      }
    }
  } catch (error) {
    console.error('Erro ao carregar configurações (async):', error);
  }

  const fallbackSettings = loadSettingsFromLocalStorage();
  if (fallbackSettings) {
    applyLoadedSettings(fallbackSettings);
    return fallbackSettings;
  }

  return null;
}

export function loadSettings() {
  try {
    if (window.electronAPI && window.electronAPI.loadSettings) {
      window.electronAPI
        .loadSettings()
        .then((settings) => {
          if (settings) {
            console.log('Carregando configurações salvas:', settings);
            applyLoadedSettings(settings);
          }
        })
        .catch((error) => {
          console.error('Erro ao carregar configurações via Electron:', error);
          const fallbackSettings = loadSettingsFromLocalStorage();
          if (fallbackSettings) {
            applyLoadedSettings(fallbackSettings);
          }
        });
      return;
    }
  } catch (error) {
    console.error('Erro ao carregar configurações:', error);
  }

  const fallbackSettings = loadSettingsFromLocalStorage();
  if (fallbackSettings) {
    applyLoadedSettings(fallbackSettings);
  }
}

export function loadSettingsFromLocalStorage() {
  try {
    const storedSettings = localStorage.getItem('app-settings');
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      console.log('Configurações carregadas do localStorage:', parsed);
      return parsed;
    }
  } catch (error) {
    console.error('Erro ao carregar configurações do localStorage:', error);
  }
  return null;
}

export function applyLoadedSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    return;
  }

  if (settings.links && settings.links.length > 0) {
    loaders.loadLinks(settings.links);
  }

  if (settings.proxies && settings.proxies.length > 0) {
    loaders.loadProxies(settings.proxies);
  }

  if (settings.rotatingProxies && settings.rotatingProxies.length > 0) {
    loaders.loadRotatingProxies(settings.rotatingProxies);
  }

  if (settings.pixKeys && settings.pixKeys.length > 0) {
    loaders.loadPixKeys(settings.pixKeys);
  }

  if (settings.extensions && settings.extensions.length > 0) {
    loaders.loadExtensions(settings.extensions);
  }

  if (settings.settings) {
    const delayCount = document.getElementById('delay-count');
    const openingsCount = document.getElementById('openings-count');

    if (delayCount && settings.settings.delay !== undefined) {
      delayCount.textContent = settings.settings.delay;
    }

    if (openingsCount && settings.settings.openings !== undefined) {
      openingsCount.textContent = settings.settings.openings;
    }
  }

  if (settings.resolution) {
    const { width, height, useDefault } = settings.resolution;
    const defaultCheckbox = document.getElementById(
      'default-resolution-checkbox',
    );
    const widthInput = document.getElementById('width-input');
    const heightInput = document.getElementById('height-input');

    if (width) {
      updateDefaults({ width });
      if (widthInput) {
        widthInput.value = width;
      }
    }

    if (height) {
      updateDefaults({ height });
      if (heightInput) {
        heightInput.value = height;
      }
    }

    if (typeof useDefault === 'boolean' && defaultCheckbox) {
      defaultCheckbox.checked = useDefault;
      if (widthInput) widthInput.disabled = useDefault;
      if (heightInput) heightInput.disabled = useDefault;
    }
  }

  if (settings.selectedMonitor !== undefined) {
    loaders.applySelectedMonitor(settings.selectedMonitor);
  }

  if (settings.automation) {
    const generateWithdrawToggle = document.getElementById(
      'generate-withdraw-toggle',
    );
    const muteAudioToggle = document.getElementById('mute-audio-toggle');
    const depositMinInput = document.getElementById('deposit-min');
    const depositMaxInput = document.getElementById('deposit-max');
    const delayToggle = document.getElementById('delay-toggle');
    const delayControls = document.getElementById('delay-controls');
    const passwordField = document.getElementById('password-field');
    const withdrawPasswordField = document.getElementById(
      'withdraw-password-field',
    );
    const randomPasswordsToggle = document.getElementById(
      'random-passwords-toggle',
    );
    const categoriaField = document.getElementById('categoria-field');
    const jogoField = document.getElementById('jogo-field');
    const pixKeyTypeField = document.getElementById('pix-key-type');

    if (generateWithdrawToggle) {
      generateWithdrawToggle.checked =
        settings.automation.generateWithdraw || false;
    }

    if (muteAudioToggle) {
      muteAudioToggle.checked = settings.automation.muteAudio || false;
    }

    if (depositMinInput && settings.automation.depositMin !== undefined) {
      depositMinInput.value = settings.automation.depositMin;
    }

    if (depositMaxInput && settings.automation.depositMax !== undefined) {
      depositMaxInput.value = settings.automation.depositMax;
    }

    if (delayToggle) {
      delayToggle.checked = settings.automation.delayEnabled || false;
      if (delayControls) {
        if (settings.automation.delayEnabled) {
          delayControls.classList.remove('hidden');
        } else {
          delayControls.classList.add('hidden');
        }
      }
    }

    if (passwordField && settings.automation.password !== undefined) {
      passwordField.value = settings.automation.password;
    }

    if (
      withdrawPasswordField &&
      settings.automation.withdrawPassword !== undefined
    ) {
      withdrawPasswordField.value = settings.automation.withdrawPassword;
    }

    if (randomPasswordsToggle) {
      randomPasswordsToggle.checked =
        settings.automation.randomPasswords || false;
    }

    if (categoriaField && settings.automation.categoria !== undefined) {
      categoriaField.value = settings.automation.categoria;
    }

    if (jogoField && settings.automation.jogo !== undefined) {
      jogoField.value = settings.automation.jogo;
    }

    if (pixKeyTypeField && settings.automation.pixKeyType) {
      pixKeyTypeField.value = mapPixKeyTypeFromFile(
        settings.automation.pixKeyType,
      );
    }
  }

  if (settings.settings && settings.settings.toggles) {
    const togglesToApply = { ...settings.settings.toggles };
    delete togglesToApply['default-resolution-checkbox'];
    loaders.applyToggleStates(togglesToApply);
  }

  loaders.updatePixCount();
  loaders.updateExtensionCount();
  loaders.updateProxyCount();
}
