import { showNotification } from '../ui/notifications.js';
import { state } from '../state.js';
import {
  saveSettings,
  loadSettingsAsync,
  registerSettingsLoaders,
} from '../settings/storage.js';
import { consumeProxy, getRotatingProxy } from '../links/index.js';

// Log para debug

// === SISTEMA DE DETECAAO DE MONITORES ===

// VariAveis globais para monitores

/**
 * Detecta automaticamente os monitores e atualiza a interface
 */
async function detectarEAtualizarMonitores() {
  try {
    console.log('Iniciando detecAAo de monitores...');

    if (!window.electronAPI || !window.electronAPI.detectMonitors) {
      console.warn('API de detecAAo de monitores nAo disponAvel');
      return;
    }

    const result = await window.electronAPI.detectMonitors();

    if (result.success) {
      state.monitors.detected = result.monitores.detalhes;
      console.log('Monitores detectados:', state.monitors.detected);

      // Salvar dados dos monitores detectados
      await salvarDadosMonitores();

      // Atualizar o select de monitores
      atualizarSelectMonitores(state.monitors.detected);

      // Verificar se hA uma configuraAAo salva antes de selecionar automaticamente
      const settings = await loadSettingsAsync();
      let monitorParaSelecionar = null;

      if (settings && settings.selectedMonitor) {
        // Se hA configuraAAo salva, usar ela
        if (settings.selectedMonitor === 'todos') {
          monitorParaSelecionar = 'todos';
        } else {
          const indiceConfigurado = parseInt(settings.selectedMonitor);
          if (
            indiceConfigurado >= 0 &&
            indiceConfigurado < state.monitors.detected.length
          ) {
            monitorParaSelecionar = indiceConfigurado;
          }
        }
      }

      // Se nAo hA configuraAAo vAlida, usar o monitor primArio ou primeiro
      if (monitorParaSelecionar === null) {
        const indiceMonitorPrimario = state.monitors.detected.findIndex(
          (m) => m.ehPrimario,
        );
        if (indiceMonitorPrimario >= 0) {
          monitorParaSelecionar = indiceMonitorPrimario;
        } else if (state.monitors.detected.length > 0) {
          monitorParaSelecionar = 0;
        }
      }

      // Aplicar a seleAAo apenas se nAo hA um monitor jA selecionado
      const monitorSelect = document.getElementById('monitor-select');
      const jaTemSelecao =
        monitorSelect && monitorSelect.value && monitorSelect.value !== '';

      if (monitorParaSelecionar !== null && !jaTemSelecao) {
        if (monitorSelect) {
          monitorSelect.value = monitorParaSelecionar;
        }
        if (monitorParaSelecionar === 'todos') {
          selecionarMonitor('todos');
        } else {
          selecionarMonitor(monitorParaSelecionar);
        }
        console.log(
          'Monitor selecionado automaticamente:',
          monitorParaSelecionar,
        );
      } else if (jaTemSelecao) {
        console.log(
          'Monitor jA estava selecionado, mantendo configuraAAo:',
          monitorSelect.value,
        );
      }
    } else {
      console.error('Erro na detecAAo de monitores:', result.error);
      console.warn(
        'Sistema nAo conseguiu detectar monitores. Verifique as permissAes do sistema.',
      );
    }
  } catch (error) {
    console.error('Erro ao detectar monitores:', error);
    console.warn(
      'Sistema nAo conseguiu detectar monitores. Verifique as permissAes do sistema.',
    );
  }
}

/**
 * Atualiza o select de monitores com os monitores detectados
 */
function atualizarSelectMonitores(monitores) {
  const monitorSelect = document.getElementById('monitor-select');
  if (!monitorSelect) return;

  // Limpar opAAes existentes
  monitorSelect.innerHTML = '';

  // Adicionar opAAes para cada monitor
  monitores.forEach((monitor, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `${monitor.nome} - ${monitor.resolucao}`;
    monitorSelect.appendChild(option);
  });

  // Adicionar opAAo "Todos os monitores"
  const allMonitorsOption = document.createElement('option');
  allMonitorsOption.value = monitores.length; // Usar o Andice apAs o Altimo monitor
  allMonitorsOption.textContent = 'Todos os Monitores';
  monitorSelect.appendChild(allMonitorsOption);

  // Remover listeners anteriores e adicionar novo evento de mudanAa
  monitorSelect.removeEventListener('change', handleMonitorChange);
  monitorSelect.addEventListener('change', handleMonitorChange);
}

/**
 * Handler para mudanAa de seleAAo de monitor
 */
function handleMonitorChange(e) {
  selecionarMonitor(parseInt(e.target.value, 10), { shouldSave: true });
}

/**
 * Seleciona um monitor e calcula sua capacidade
 */
async function selecionarMonitor(indice, options = {}) {
  const { shouldSave = true } = options;
  if (indice < 0 || indice > state.monitors.detected.length) return;

  // Se o Andice A igual ao nAmero de monitores, significa "Todos os monitores"
  if (indice === state.monitors.detected.length) {
    state.monitors.selected = null; // Indica que todos os monitores foram selecionados
    console.log('Selecionado: Todos os monitores');

    // Calcular capacidade total de todos os monitores
    await calcularCapacidadeTodosMonitores();
  } else {
    state.monitors.selected = state.monitors.detected[indice];
    console.log('Monitor selecionado:', state.monitors.selected);

    // Calcular capacidade do monitor
    await calcularCapacidadeMonitor(state.monitors.selected);
  }

  // Salvar configuraAAes automaticamente quando o monitor for selecionado
  if (shouldSave) {
    saveSettings();
  }
}

/**
 * Salva os dados dos monitores e posicionamento no arquivo JSON
 */
async function salvarDadosMonitores() {
  try {
    // Obter configuraAAo atual da interface
    const defaultCheckbox = document.getElementById(
      'default-resolution-checkbox',
    );
    const widthInput = document.getElementById('width-input');
    const heightInput = document.getElementById('height-input');

    let larguraLogica, alturaLogica;

    if (defaultCheckbox && defaultCheckbox.checked) {
      larguraLogica = state.defaults.fallbackWidth;
      alturaLogica = state.defaults.fallbackHeight;
    } else {
      larguraLogica = parseInt(widthInput?.value) || state.defaults.width;
      alturaLogica = parseInt(heightInput?.value) || state.defaults.height;
    }

    const config = {
      larguraLogica: larguraLogica,
      alturaLogica: alturaLogica,
      fatorEscala: 0.65,
    };

    const resultado = await window.electronAPI.saveMonitorData(
      state.monitors.detected,
      state.monitors.positioning,
      config,
    );
    if (resultado.success) {
      console.log('Dados dos monitores salvos com sucesso');
    } else {
      console.error('Erro ao salvar dados dos monitores:', resultado.error);
    }
    return resultado;
  } catch (error) {
    console.error('Erro ao salvar dados dos monitores:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Carrega os dados dos monitores salvos do arquivo JSON
 */
async function carregarDadosMonitores() {
  try {
    const resultado = await window.electronAPI.loadMonitorData();
    if (resultado.success && resultado.data) {
      console.log('Dados dos monitores carregados:', resultado.data);
      return resultado.data;
    } else {
      console.log('Nenhum dado de monitor salvo encontrado');
      return null;
    }
  } catch (error) {
    console.error('Erro ao carregar dados dos monitores:', error);
    return null;
  }
}

/**
 * Calcula a capacidade de navegadores para o monitor selecionado
 */
// FunAAo base que contAm toda a lAgica compartilhada de cAlculo de capacidade
async function calcularCapacidadeBase(monitor, config) {
  try {
    if (!window.electronAPI || !window.electronAPI.calculateMonitorCapacity) {
      throw new Error('API de cAlculo de capacidade nAo disponAvel');
    }

    // Usar configuraAAo fornecida ou obter valores da interface
    let configCalculo = config;

    if (!configCalculo) {
      // Obter valores da interface ou usar padrAes
      const defaultCheckbox = document.getElementById(
        'default-resolution-checkbox',
      );
      const widthInput = document.getElementById('width-input');
      const heightInput = document.getElementById('height-input');

      let larguraLogica, alturaLogica;

      if (defaultCheckbox && defaultCheckbox.checked) {
        // Usar valores padrAo
        larguraLogica = state.defaults.fallbackWidth;
        alturaLogica = state.defaults.fallbackHeight;
      } else {
        // Usar valores dos campos da interface
        larguraLogica = parseInt(widthInput?.value) || state.defaults.width;
        alturaLogica = parseInt(heightInput?.value) || state.defaults.height;
      }

      configCalculo = {
        larguraLogica: larguraLogica,
        alturaLogica: alturaLogica,
        fatorEscala: 0.65,
      };
    }

    // Chamar a API do Electron para calcular capacidade
    const result = await window.electronAPI.calculateMonitorCapacity(
      monitor,
      configCalculo,
    );

    if (!result.success) {
      throw new Error(result.error || 'Erro desconhecido no cAlculo');
    }

    return {
      success: true,
      capacidade: result.capacidade,
      posicoes: result.posicoes,
      monitor: monitor,
      config: configCalculo,
    };
  } catch (error) {
    console.error('Erro no cAlculo de capacidade:', error);
    return {
      success: false,
      error: error.message,
      monitor: monitor,
    };
  }
}

async function calcularCapacidadeMonitor(monitor) {
  // Verificar se jA existem dados salvos para este monitor
  const monitorId = `monitor_${monitor.id || Date.now()}`;
  const dadosExistentes = state.monitors.positioning.find(
    (item) => item.id === monitorId,
  );

  // Se existem dados salvos e a configuraAAo nAo mudou, usar os dados existentes
  if (dadosExistentes && dadosExistentes.config) {
    const configAtual = {
      larguraLogica:
        parseInt(document.getElementById('width-input')?.value) ||
        state.defaults.width,
      alturaLogica:
        parseInt(document.getElementById('height-input')?.value) ||
        state.defaults.height,
      fatorEscala: 0.65,
    };

    const configSalva = dadosExistentes.config;
    const configIgual =
      configSalva.larguraLogica === configAtual.larguraLogica &&
      configSalva.alturaLogica === configAtual.alturaLogica &&
      configSalva.fatorEscala === configAtual.fatorEscala;

    if (configIgual) {
      console.log(
        'Usando posiAAes salvas para o monitor:',
        dadosExistentes.capacidade,
      );

      // Atualizar interface com dados salvos
      const capacityElement = document.getElementById('monitor-capacity');
      if (capacityElement) {
        capacityElement.textContent = `${dadosExistentes.capacidade} navegadores`;
      }

      state.monitors.maxCapacity = dadosExistentes.capacidade;

      const openingsSlider = document.querySelector('input[type="range"]');
      const openingsCount = document.getElementById('openings-count');

      if (openingsSlider) {
        openingsSlider.max = dadosExistentes.capacidade;
        const currentValue = parseInt(openingsCount?.textContent || '1');
        if (currentValue > dadosExistentes.capacidade) {
          openingsSlider.value = dadosExistentes.capacidade;
          if (openingsCount) {
            openingsCount.textContent = dadosExistentes.capacidade;
          }
        }
      }
      return;
    }
  }

  // SA recalcular se nAo existem dados ou se a configuraAAo mudou
  const configAtual = {
    larguraLogica:
      parseInt(document.getElementById('width-input')?.value) ||
      state.defaults.fallbackWidth,
    alturaLogica:
      parseInt(document.getElementById('height-input')?.value) ||
      state.defaults.fallbackHeight,
    fatorEscala: 0.65,
  };
  const result = await calcularCapacidadeBase(monitor, configAtual);

  if (result.success) {
    console.log('Capacidade recalculada:', result.capacidade);
    console.log('PosiAAes dos navegadores:', result.posicoes);

    // Armazenar dados de posicionamento com ID Anico
    const dadosMonitor = {
      id: monitorId,
      monitor: monitor,
      config: result.config,
      capacidade: result.capacidade,
      posicoes: result.posicoes,
      timestamp: new Date().toISOString(),
    };

    // Atualizar array de posicionamento
    const indiceExistente = state.monitors.positioning.findIndex(
      (item) => item.id === dadosMonitor.id,
    );
    if (indiceExistente >= 0) {
      state.monitors.positioning[indiceExistente] = dadosMonitor;
    } else {
      state.monitors.positioning.push(dadosMonitor);
    }

    // Salvar dados automaticamente
    await salvarDadosMonitores();

    // Atualizar a interface com a capacidade
    const capacityElement = document.getElementById('monitor-capacity');
    if (capacityElement) {
      capacityElement.textContent = `${result.capacidade} navegadores`;
    }

    // Atualizar o mAximo de aberturas simultAneas
    const openingsCount = document.getElementById('openings-count');
    const openingsSlider = document.querySelector('input[type="range"]');

    // Atualizar a capacidade mAxima global
    state.monitors.maxCapacity = result.capacidade;

    if (openingsSlider) {
      openingsSlider.max = result.capacidade;

      // Se o valor atual for maior que a capacidade, ajustar
      const currentValue = parseInt(openingsCount?.textContent || '1');
      if (currentValue > result.capacidade) {
        openingsSlider.value = result.capacidade;
        if (openingsCount) {
          openingsCount.textContent = result.capacidade;
        }
      }
    }
  } else {
    console.error('Erro ao calcular capacidade:', result.error);

    // Valor padrAo em caso de erro
    const capacityElement = document.getElementById('monitor-capacity');
    if (capacityElement) {
      capacityElement.textContent = 'Erro no cAlculo';
    }
  }
}

/**
 * Calcula a capacidade total de todos os monitores
 */
async function calcularCapacidadeTodosMonitores() {
  try {
    if (!state.monitors.detected || state.monitors.detected.length === 0) {
      console.log('Nenhum monitor detectado');
      return;
    }

    // Verificar se jA existem dados salvos para todos os monitores
    const dadosExistentes = state.monitors.positioning.find(
      (item) => item.id === 'todos_monitores',
    );

    // Se existem dados salvos e a configuraAAo nAo mudou, usar os dados existentes
    if (dadosExistentes && dadosExistentes.config) {
      const configAtual = {
        larguraLogica:
          parseInt(document.getElementById('width-input')?.value) ||
          state.defaults.fallbackWidth,
        alturaLogica:
          parseInt(document.getElementById('height-input')?.value) ||
          state.defaults.fallbackHeight,
        fatorEscala: 0.65,
      };

      const configSalva = dadosExistentes.config;
      const configIgual =
        configSalva.larguraLogica === configAtual.larguraLogica &&
        configSalva.alturaLogica === configAtual.alturaLogica &&
        configSalva.fatorEscala === configAtual.fatorEscala;

      if (configIgual) {
        console.log(
          'Usando posiAAes salvas para todos os monitores:',
          dadosExistentes.capacidade,
        );

        // Atualizar interface com dados salvos
        const capacityElement = document.getElementById('monitor-capacity');
        if (capacityElement) {
          capacityElement.textContent = `${dadosExistentes.capacidade} navegadores (todos os monitores)`;
        }

        state.monitors.maxCapacity = dadosExistentes.capacidade;

        const openingsSlider = document.querySelector('input[type="range"]');
        const openingsCount = document.getElementById('openings-count');

        if (openingsSlider) {
          openingsSlider.max = dadosExistentes.capacidade;
          const currentValue = parseInt(openingsCount?.textContent || '1');
          if (currentValue > dadosExistentes.capacidade) {
            openingsSlider.value = dadosExistentes.capacidade;
            if (openingsCount) {
              openingsCount.textContent = dadosExistentes.capacidade;
            }
          }
        }
        return;
      }
    }

    // SA recalcular se nAo existem dados ou se a configuraAAo mudou
    let capacidadeTotal = 0;
    let todasPosicoes = [];
    let proximoId = 0; // Contador global para IDs Anicos

    // Calcular capacidade para cada monitor usando a funAAo base
    for (const monitor of state.monitors.detected) {
      try {
        const configAtual = {
          larguraLogica:
            parseInt(document.getElementById('width-input')?.value) ||
            state.defaults.fallbackWidth,
          alturaLogica:
            parseInt(document.getElementById('height-input')?.value) ||
            state.defaults.fallbackHeight,
          fatorEscala: 0.65,
        };
        const result = await calcularCapacidadeBase(monitor, configAtual);

        if (result && result.success) {
          capacidadeTotal += result.capacidade;

          // Corrigir IDs para serem sequenciais e Anicos
          const posicoesComIdCorrigido = result.posicoes.map((pos) => ({
            ...pos,
            id: proximoId++,
          }));

          todasPosicoes = todasPosicoes.concat(posicoesComIdCorrigido);

          console.log(
            `Monitor ${monitor.nome}: ${result.capacidade} navegadores`,
          );
        } else {
          console.error(
            `Erro ao calcular capacidade do monitor ${monitor.nome}:`,
            result?.error || 'Resultado invAlido',
          );
        }
      } catch (error) {
        console.error(
          `Erro ao calcular capacidade do monitor ${monitor.nome}:`,
          error,
        );
      }
    }

    console.log(
      'Capacidade total recalculada de todos os monitores:',
      capacidadeTotal,
    );
    console.log('Total de posiAAes disponAveis:', todasPosicoes.length);

    // Obter configuraAAo da interface para armazenamento
    const defaultCheckbox = document.getElementById(
      'default-resolution-checkbox',
    );
    const widthInput = document.getElementById('width-input');
    const heightInput = document.getElementById('height-input');

    let larguraLogica, alturaLogica;

    if (defaultCheckbox && defaultCheckbox.checked) {
      larguraLogica = state.defaults.fallbackWidth;
      alturaLogica = state.defaults.fallbackHeight;
    } else {
      larguraLogica =
        parseInt(widthInput?.value) || state.defaults.fallbackWidth;
      alturaLogica =
        parseInt(heightInput?.value) || state.defaults.fallbackHeight;
    }

    const config = {
      larguraLogica: larguraLogica,
      alturaLogica: alturaLogica,
      fatorEscala: 0.65,
    };

    // Armazenar dados de posicionamento para todos os monitores
    const dadosTodosMonitores = {
      id: 'todos_monitores',
      monitores: state.monitors.detected,
      config: config,
      capacidade: capacidadeTotal,
      posicoes: todasPosicoes,
      timestamp: new Date().toISOString(),
    };

    // Atualizar array de posicionamento
    const indiceExistente = state.monitors.positioning.findIndex(
      (item) => item.id === 'todos_monitores',
    );
    if (indiceExistente >= 0) {
      state.monitors.positioning[indiceExistente] = dadosTodosMonitores;
    } else {
      state.monitors.positioning.push(dadosTodosMonitores);
    }

    // Salvar dados automaticamente
    await salvarDadosMonitores();

    // Atualizar a interface com a capacidade total
    const capacityElement = document.getElementById('monitor-capacity');
    if (capacityElement) {
      capacityElement.textContent = `${capacidadeTotal} navegadores (todos os monitores)`;
    }

    // Atualizar o mAximo de aberturas simultAneas
    const openingsCount = document.getElementById('openings-count');
    const openingsSlider = document.querySelector('input[type="range"]');

    // Atualizar a capacidade mAxima global
    state.monitors.maxCapacity = capacidadeTotal;

    if (openingsSlider) {
      openingsSlider.max = capacidadeTotal;

      // Se o valor atual for maior que a capacidade, ajustar
      const currentValue = parseInt(openingsCount?.textContent || '1');
      if (currentValue > capacidadeTotal) {
        openingsSlider.value = capacidadeTotal;
        if (openingsCount) {
          openingsCount.textContent = capacidadeTotal;
        }
      }
    }
  } catch (error) {
    console.error('Erro ao calcular capacidade de todos os monitores:', error);

    // Valor padrAo em caso de erro
    const capacityElement = document.getElementById('monitor-capacity');
    if (capacityElement) {
      capacityElement.textContent = 'Erro no cAlculo';
    }
  }
}

/**
 * Inicializa o sistema de detecAAo de monitores
 */
async function inicializarSistemaMonitores() {
  console.log('Inicializando sistema de monitores...');

  // Carregar dados salvos anteriormente
  const dadosSalvos = await carregarDadosMonitores();
  if (dadosSalvos) {
    if (dadosSalvos.monitores) {
      state.monitors.detected = dadosSalvos.monitores;
      console.log('Monitores carregados do arquivo:', state.monitors.detected);
    }
    if (dadosSalvos.posicionamento) {
      state.monitors.positioning = dadosSalvos.posicionamento;
      console.log(
        'Dados de posicionamento carregados:',
        state.monitors.positioning,
      );
    }
  }

  // Detectar monitores automaticamente quando a aplicaAAo carregar (sempre atualizar)
  await detectarEAtualizarMonitores();

  // Inicializar controles de resoluAAo
  inicializarControlesResolucao();
}

/**
 * Inicializa os controles de resoluAAo (checkbox padrAo e campos de largura/altura)
 */
/**
 * Configura event listeners para campos de resoluAAo
 * @param {HTMLInputElement} widthInput - Campo de largura
 * @param {HTMLInputElement} heightInput - Campo de altura
 * @param {HTMLInputElement} defaultCheckbox - Checkbox de resoluAAo padrAo
 */
function setupResolutionListeners(widthInput, heightInput, defaultCheckbox) {
  // FunAAo compartilhada para recAlculo de capacidade
  function recalcularCapacidade() {
    if (!defaultCheckbox.checked) {
      if (state.monitors.selected) {
        calcularCapacidadeMonitor(state.monitors.selected);
      } else if (
        state.monitors.selected === null &&
        state.monitors.detected.length > 0
      ) {
        calcularCapacidadeTodosMonitores();
      }
    }
    // Salvar configuraAAes automaticamente apAs mudanAa
    debouncedSave();
  }

  // Aplicar o mesmo listener para ambos os campos
  widthInput.addEventListener('input', recalcularCapacidade);
  heightInput.addEventListener('input', recalcularCapacidade);
}

function inicializarControlesResolucao() {
  const defaultCheckbox = document.getElementById(
    'default-resolution-checkbox',
  );
  const widthInput = document.getElementById('width-input');
  const heightInput = document.getElementById('height-input');

  if (defaultCheckbox && widthInput && heightInput) {
    // FunAAo para atualizar estado dos campos
    function atualizarEstadoCampos() {
      const isDefault = defaultCheckbox.checked;
      widthInput.disabled = isDefault;
      heightInput.disabled = isDefault;

      if (isDefault) {
        widthInput.value = state.defaults.fallbackWidth.toString();
        heightInput.value = state.defaults.fallbackHeight.toString();
      }

      // Recalcular capacidade quando houver mudanAa
      if (state.monitors.selected) {
        calcularCapacidadeMonitor(state.monitors.selected);
      } else if (
        state.monitors.selected === null &&
        state.monitors.detected.length > 0
      ) {
        // Todos os monitores selecionados
        calcularCapacidadeTodosMonitores();
      }
    }

    // Event listener para checkbox
    defaultCheckbox.addEventListener('change', () => {
      atualizarEstadoCampos();
      // Salvar configuraAAes automaticamente apAs mudanAa
      debouncedSave();
    });

    // Aguardar um pouco antes de configurar os event listeners para evitar
    // que sejam disparados durante o carregamento inicial das configuraAAes
    setTimeout(() => {
      setupResolutionListeners(widthInput, heightInput, defaultCheckbox);
    }, 1000);

    // Inicializar estado apenas se nAo hA valores jA definidos
    if (!widthInput.value || !heightInput.value) {
      atualizarEstadoCampos();
    } else {
      // Apenas atualizar o estado dos campos sem alterar valores
      const isDefault = defaultCheckbox.checked;
      widthInput.disabled = isDefault;
      heightInput.disabled = isDefault;
    }
  }
}

/**
 * Valida configuraAAo de proxy baseada no modo selecionado
 * @param {string} proxyMode - Modo do proxy ('list' ou 'rotating')
 * @param {Object} settings - ConfiguraAAes do aplicativo
 * @param {number} simultaneousOpenings - NAmero de aberturas simultAneas
 * @returns {Object} Resultado da validaAAo com success, proxyList e message
 */
function validateProxyConfiguration(proxyMode, settings, simultaneousOpenings) {
  let proxyList = [];

  if (proxyMode === 'none') {
    // Modo sem proxy - navegadores serAo abertos sem proxy
    return {
      success: true,
      proxyList: [],
      message: 'Navegadores serAo abertos sem proxy',
      type: 'info',
    };
  } else if (proxyMode === 'list') {
    // Para modo lista, usar proxies da lista de proxies
    let listProxies = [];
    if (Array.isArray(settings.proxies)) {
      listProxies = settings.proxies.filter((p) => p && p.trim());
    } else if (typeof settings.proxies === 'string') {
      listProxies = settings.proxies.split('\n').filter((p) => p.trim());
    }

    // Validar se hA proxies suficientes
    if (listProxies.length === 0) {
      return {
        success: false,
        message:
          'Nenhum proxy configurado na Lista de Proxies. Adicione proxies antes de abrir os navegadores.',
        type: 'error',
      };
    }

    if (listProxies.length < simultaneousOpenings) {
      return {
        success: false,
        message: `Erro: Apenas ${listProxies.length} proxies disponAveis para ${simultaneousOpenings} navegadores. Adicione mais proxies ou reduza o nAmero de aberturas simultAneas.`,
        type: 'error',
      };
    }

    // Usar proxies da lista (consumir um por navegador)
    proxyList = listProxies.slice(0, simultaneousOpenings);

    return {
      success: true,
      proxyList: proxyList,
      message: `${proxyList.length} proxies da lista serAo utilizados`,
      type: 'info',
    };
  } else if (proxyMode === 'rotating') {
    // Para modo rotativo, usar o proxy rotativo Anico
    const rotatingProxy = getRotatingProxy();

    if (!rotatingProxy) {
      return {
        success: false,
        message:
          'Nenhum proxy configurado em Proxy Rotativo. Adicione um proxy antes de abrir os navegadores.',
        type: 'warning',
      };
    }

    // No modo rotativo, todos os navegadores usam o mesmo proxy
    proxyList = [rotatingProxy];

    return {
      success: true,
      proxyList: proxyList,
      message: `Proxy rotativo ${rotatingProxy} serA utilizado para todos os navegadores`,
      type: 'info',
    };
  }

  return {
    success: false,
    message: 'Modo de proxy invAlido',
    type: 'error',
  };
}

// FunAAo para atualizar localStorage do popup de sincronizaAAo automaticamente
async function updateSyncPopupLocalStorage() {
  try {
    console.log('Atualizando localStorage do popup de sincronizaAAo...');

    // Obter navegadores ativos SEM filtrar pelos estados para nAo criar loop
    const result = await window.electronAPI.getActiveBrowsers();

    if (result.success && result.browsers && result.browsers.length > 0) {
      const activeBrowsers = result.browsers;
      console.log(
        'Navegadores ativos encontrados para localStorage:',
        activeBrowsers,
      );

      // Verificar se jA existem estados salvos
      let existingStates = null;
      try {
        const savedStates = localStorage.getItem('syncPopupCheckboxStates');
        if (savedStates) {
          existingStates = JSON.parse(savedStates);
          console.log('Estados existentes encontrados:', existingStates);
        }
      } catch (error) {
        console.warn('Erro ao carregar estados existentes:', error);
      }

      // Se nAo hA estados existentes, criar estados padrAo
      if (!existingStates) {
        const states = {
          selectAll: true, // Marcar "Todos" como verdadeiro por padrAo
        };

        // Marcar todos os navegadores ativos como selecionados
        activeBrowsers.forEach((browserId) => {
          states[browserId] = true;
        });

        // Salvar no localStorage
        localStorage.setItem('syncPopupCheckboxStates', JSON.stringify(states));
        console.log(
          'Estados padrAo criados e salvos no localStorage:',
          states,
        );
      } else {
        // Atualizar estados existentes apenas para novos navegadores
        let updated = false;
        activeBrowsers.forEach((browserId) => {
          if (!(browserId in existingStates)) {
            existingStates[browserId] = true; // Novos navegadores marcados por padrAo
            updated = true;
          }
        });

        if (updated) {
          localStorage.setItem(
            'syncPopupCheckboxStates',
            JSON.stringify(existingStates),
          );
          console.log(
            'Estados existentes atualizados com novos navegadores:',
            existingStates,
          );
        } else {
          console.log(
            'Nenhuma atualizaAAo necessAria nos estados existentes',
          );
        }
      }

      console.log(
        'localStorage do popup de sincronizaAAo atualizado com sucesso!',
      );
    } else {
      console.log(
        'Nenhum navegador ativo encontrado para atualizar localStorage',
      );
    }
  } catch (error) {
    console.error(
      'Erro ao atualizar localStorage do popup de sincronizaAAo:',
      error,
    );
  }
}

// FunAAo para abrir navegadores
async function abrirNavegadores() {
  try {
    console.log('Iniciando abertura de navegadores...');

    // Carregar configuraAAes atuais
    const settings = await window.electronAPI.loadSettings();
    if (!settings) {
      showNotification(
        'Erro ao carregar configuraAAes. Verifique se as configuraAAes estAo salvas.',
        'error',
      );
      return;
    }

    // Obter links configurados
    const links = settings.links || [];
    if (links.length === 0) {
      showNotification(
        'Nenhum link configurado. Adicione links antes de abrir os navegadores.',
        'warning',
      );
      return;
    }

    // Obter nAmero de aberturas simultAneas
    const simultaneousOpenings = settings.settings?.openings || 1;

    // Obter modo de proxy
    const proxyMode = getProxyMode(settings.settings?.toggles);

    // Validar configuraAAo de proxy usando funAAo centralizada
    const proxyValidation = validateProxyConfiguration(
      proxyMode,
      settings,
      simultaneousOpenings,
    );

    if (!proxyValidation.success) {
      showNotification(proxyValidation.message, proxyValidation.type);
      return;
    }

    const proxyList = proxyValidation.proxyList;

    // Log e notificaAAo de sucesso
    if (proxyMode === 'none') {
      console.log(`Abrindo ${simultaneousOpenings} navegadores sem proxy`);
    } else if (proxyMode === 'list') {
      console.log(
        `Usando ${proxyList.length} proxies da lista para ${simultaneousOpenings} navegadores`,
      );
    } else if (proxyMode === 'rotating') {
      console.log(
        `Usando proxy rotativo: ${proxyList[0]} para todos os navegadores`,
      );
    }

    showNotification(proxyValidation.message, proxyValidation.type, 2000);

    // Obter configuraAAo de resoluAAo da interface
    const defaultCheckbox = document.getElementById(
      'default-resolution-checkbox',
    );
    const widthInput = document.getElementById('width-input');
    const heightInput = document.getElementById('height-input');

    let larguraLogica, alturaLogica;

    if (defaultCheckbox && defaultCheckbox.checked) {
      larguraLogica = state.defaults.fallbackWidth;
      alturaLogica = state.defaults.fallbackHeight;
    } else {
      larguraLogica =
        parseInt(widthInput?.value) || state.defaults.fallbackWidth;
      alturaLogica =
        parseInt(heightInput?.value) || state.defaults.fallbackHeight;
    }

    // Preparar opAAes para os navegadores
    const monitorIndex =
      state.monitors.selected && Array.isArray(state.monitors.detected)
        ? state.monitors.detected.findIndex(
            (monitor) => monitor && monitor.id === state.monitors.selected.id,
          )
        : -1;
    const useAllMonitors = monitorIndex < 0;
    const selectedMonitorOption = useAllMonitors
      ? 'todos'
      : {
          id: state.monitors.selected.id,
          nome: state.monitors.selected.nome,
          bounds: state.monitors.selected.bounds || null,
          index: monitorIndex,
        };

    const options = {
      simultaneousOpenings: simultaneousOpenings,
      urls: links,
      proxy: {
        mode: proxyMode,
        list: proxyList,
      },
      automation: {
        muteAudio: settings.settings?.toggles?.['mute-audio-toggle'] || false,
        delay: settings.settings?.delay || 5,
      },
      blockedDomains: [
        'gcaptcha4-hrc.gsensebot.com',
        'gcaptcha4-hrc.geetest.com',
      ],
      // Incluir informaAAes do monitor selecionado
      selectedMonitor: selectedMonitorOption,
      useAllMonitors,
      // Incluir configuraAAo de resoluAAo da interface
      resolution: {
        larguraLogica: larguraLogica,
        alturaLogica: alturaLogica,
        fatorEscala: 0.65,
      },
    };

    // ValidaAAes jA foram feitas acima para cada modo de proxy

    console.log('OpAAes dos navegadores:', options);
    console.log('ConfiguraAAo de resoluAAo aplicada:', {
      larguraLogica: larguraLogica,
      alturaLogica: alturaLogica,
      fatorEscala: 0.65,
      origem: defaultCheckbox?.checked ? 'padrAo' : 'personalizada',
    });

    // Desabilitar botAo durante o processo
    const openBrowsersBtn = document.getElementById('open-browsers-btn');
    if (openBrowsersBtn) {
      openBrowsersBtn.disabled = true;
      openBrowsersBtn.textContent = 'Abrindo...';
    }

    // Chamar API para abrir navegadores
    const result = await window.electronAPI.openBrowsers(options);

    if (result.success) {
      console.log('Navegadores abertos com sucesso:', result);

      // Consumir proxies da lista apAs uso bem-sucedido
      if (proxyMode === 'list' && proxyList.length > 0) {
        const quantidadeUsada = Math.min(
          proxyList.length,
          simultaneousOpenings,
        );
        for (let i = 0; i < quantidadeUsada; i++) {
          if (proxyList[i]) {
            consumeProxy(proxyList[i]);
          }
        }
        console.log(`${quantidadeUsada} proxies consumidos da lista`);
      }

      // Atualizar localStorage automaticamente apAs abertura dos navegadores
      await updateSyncPopupLocalStorage();

      showNotification(
        `${result.janelasMovidas || 0} navegadores foram abertos e posicionados com sucesso!`,
        'success',
      );
    } else {
      console.error('Erro ao abrir navegadores:', result.error);
      showNotification(`Erro ao abrir navegadores: ${result.error}`, 'error');
    }
  } catch (error) {
    console.error('Erro ao abrir navegadores:', error);
    showNotification(`Erro inesperado: ${error.message}`, 'error');
  } finally {
    // Reabilitar botAo
    const openBrowsersBtn = document.getElementById('open-browsers-btn');
    if (openBrowsersBtn) {
      openBrowsersBtn.disabled = false;
      openBrowsersBtn.textContent = 'Abrir Navegadores';
    }
  }
}

// FunAAo auxiliar para determinar o modo de proxy
function getProxyMode(toggles) {
  if (!toggles) return 'none';

  if (toggles['proxy-mode-list']) return 'list';
  if (toggles['proxy-mode-rotating']) return 'rotating';
  return 'none';
}

// Sistema de monitores e download do Chrome agora inicializados no DOMContentLoaded principal

// Sistema de Download do Chrome

function applySelectedMonitor(selectedMonitorValue) {
  const detected = state.monitors.detected || [];
  const monitorSelect = document.getElementById('monitor-select');
  const totalMonitors = detected.length;

  const targetValue =
    selectedMonitorValue === null ||
    selectedMonitorValue === undefined ||
    selectedMonitorValue === 'todos' ||
    selectedMonitorValue === 'todos_monitores'
      ? totalMonitors.toString()
      : selectedMonitorValue.toString();

  if (monitorSelect) {
    const optionExists = Array.from(monitorSelect.options).some(
      (option) => option.value === targetValue,
    );
    if (optionExists) {
      monitorSelect.value = targetValue;
    }
  }

  const targetIndex = parseInt(targetValue, 10);
  if (Number.isNaN(targetIndex)) {
    return;
  }

  selecionarMonitor(targetIndex, { shouldSave: false });
}

registerSettingsLoaders({
  applySelectedMonitor,
});

export {
  detectarEAtualizarMonitores,
  atualizarSelectMonitores,
  handleMonitorChange,
  selecionarMonitor,
  salvarDadosMonitores,
  carregarDadosMonitores,
  calcularCapacidadeMonitor,
  calcularCapacidadeTodosMonitores,
  inicializarSistemaMonitores,
  setupResolutionListeners,
  inicializarControlesResolucao,
  validateProxyConfiguration,
  getProxyMode,
  abrirNavegadores,
  updateSyncPopupLocalStorage,
};
