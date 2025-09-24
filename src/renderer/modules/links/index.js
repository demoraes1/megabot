import { showNotification, showCustomConfirm } from '../ui/notifications.js';

import { debouncedSave } from '../settings/autosave.js';

import { showPopup, hidePopup, hideLinksDropdown, updateLinksDropdownContent, configurePopupsHooks } from './groups/popups.js';
import { getAddedPixKeys, updatePixCount, updatePixCountsByType, initializePixManagement, removeConsumedPixKeys } from './groups/pix.js';
import { normalizeUrlFrontend, validateAndNormalizeUrl } from './groups/utils.js';
import {

  registerSettingsCollectors,

  registerSettingsLoaders,

  saveSettings,

} from '../settings/storage.js';



function initializeLinkManagement() {

  // BotAo principal adicionar links (abre popup de URLs)

  const linksBtn = document.getElementById('links-btn');

  if (linksBtn) {

    linksBtn.addEventListener('click', (e) => {

      e.preventDefault();

      showPopup('url-popup-overlay');

    });

  }



  // BotAo adicionar link dentro do popup

  const addItemBtn = document.getElementById('add-item-btn');

  if (addItemBtn) {

    addItemBtn.addEventListener('click', () => {

      addNewLinkInput();

    });

  }



  // Adicionar event listeners para inputs existentes

  const existingInputs = document.querySelectorAll(

    '#links-container input[type="text"]',

  );

  existingInputs.forEach((input) => {

    input.addEventListener('input', updateCriarContasButton);

    input.addEventListener('blur', updateCriarContasButton);

  });



  // Atualizar o botAo na inicializaAAo

  updateCriarContasButton();



  // Funcionalidade para chaves PIX

  initializePixManagement();



  // BotAo adicionar extensAo

  const uploadExtensionBtn = document.getElementById('upload-extension-btn');

  if (uploadExtensionBtn) {

    uploadExtensionBtn.addEventListener('click', () => {

      const extensionInput = document.getElementById('extension-folder-input');

      if (extensionInput) {

        extensionInput.click();

      }

    });

  }



  // Input de arquivo PIX

  const pixFileInput = document.getElementById('pix-file-input');

  if (pixFileInput) {

    pixFileInput.addEventListener('change', handlePixFileUpload);

  }



  // Input de extensAo

  const extensionInput = document.getElementById('extension-folder-input');

  if (extensionInput) {

    extensionInput.addEventListener('change', handleExtensionUpload);

  }



  // Funcionalidade para proxies

  initializeProxyManagement();

}



// FunAAes auxiliares







function toggleLinksDropdown() {

  const links = getAddedLinks();

  const dropdown = document.getElementById('links-dropdown');

  const arrow = document.getElementById('dropdown-arrow');

  const criarContasBtn = document.getElementById('criar-contas-btn');

  const criarContasText = document.getElementById('criar-contas-text');



  // Se nAo hA links, mostrar mensagem

  if (links.length === 0) {

    showNotification(

      'Nenhum link foi adicionado. Por favor, adicione links primeiro.',

      'warning',

    );

    return;

  }



  // Se hA apenas um link, executar diretamente

  if (links.length === 1) {

    console.log('Executando criaAAo de contas com link Anico:', links[0]);

    executeAccountCreation(links[0]);

    return;

  }



  // Se hA mAltiplos links, mostrar dropdown

  if (dropdown && arrow && criarContasBtn) {

    // Atualizar conteAdo do dropdown

    updateLinksDropdownContent(links);



    // Toggle dropdown

    const isHidden = dropdown.classList.contains('hidden');



    if (isHidden) {

      // Mostrar dropdown

      dropdown.classList.remove('hidden');

      arrow.classList.remove('hidden');

      arrow.style.transform = 'rotate(180deg)';

      criarContasBtn.classList.add('dropdown-active');

      criarContasText.textContent = `Criar contas (${links.length} links)`;

    } else {

      // Esconder dropdown

      dropdown.classList.add('hidden');

      arrow.style.transform = 'rotate(0deg)';

      criarContasBtn.classList.remove('dropdown-active');

      criarContasText.textContent = 'Criar contas';

    }

  }

}



// FunAAo para obter links adicionados

function getAddedLinks() {

  const linksContainer = document.getElementById('links-container');

  const links = [];



  if (linksContainer) {

    const linkInputs = linksContainer.querySelectorAll('input[type="text"]');

    linkInputs.forEach((input) => {

      const value = input.value.trim();

      if (value) {

        // Normalizar URL antes de adicionar A lista

        const normalizedUrl = normalizeUrlFrontend(value);

        links.push(normalizedUrl);

        console.log(

          `Link coletado e normalizado: ${value} -> ${normalizedUrl}`,

        );

      }

    });

  }



  return links;

}



// FunAAo para obter proxies adicionados

function getAddedProxies() {

  const proxies = [];



  // Obter proxies da lista principal

  const proxyList = document.getElementById('proxy-list');

  if (proxyList && proxyList.value.trim() !== '') {

    const listProxies = proxyList.value

      .split('\n')

      .filter((proxy) => proxy.trim() !== '');

    proxies.push(...listProxies);

  }



  // Obter proxies da lista do popup

  const proxyListPopup = document.getElementById('proxy-list-popup');

  if (proxyListPopup && proxyListPopup.value.trim() !== '') {

    const listProxies = proxyListPopup.value

      .split('\n')

      .filter((proxy) => proxy.trim() !== '');

    proxies.push(...listProxies);

  }



  // Nota: Proxies rotativos nAo sAo incluAdos na lista geral

  // Eles sAo tratados separadamente na lAgica de abertura de navegadores



  // Remover duplicatas

  return [...new Set(proxies.map((proxy) => proxy.trim()))];

}



// FunAAo para consumir (remover) um proxy da lista apAs uso

function consumeProxy(proxyToRemove) {

  if (!proxyToRemove) return;



  console.log('Consumindo proxy:', proxyToRemove);



  // Remover da lista principal

  const proxyList = document.getElementById('proxy-list');

  if (proxyList && proxyList.value.includes(proxyToRemove)) {

    const proxies = proxyList.value

      .split('\n')

      .filter((proxy) => proxy.trim() !== proxyToRemove.trim());

    proxyList.value = proxies.join('\n');

  }



  // Remover da lista do popup

  const proxyListPopup = document.getElementById('proxy-list-popup');

  if (proxyListPopup && proxyListPopup.value.includes(proxyToRemove)) {

    const proxies = proxyListPopup.value

      .split('\n')

      .filter((proxy) => proxy.trim() !== proxyToRemove.trim());

    proxyListPopup.value = proxies.join('\n');

  }



  // Atualizar contador

  updateProxyCount();



  // Salvar configuraAAes

  debouncedSave();



  console.log('Proxy consumido e removido da lista:', proxyToRemove);

}



// FunAAo para obter prAximo proxy disponAvel (sem remover)

function getNextAvailableProxy() {

  const proxies = getAddedProxies();

  return proxies.length > 0 ? proxies[0] : null;

}



// FunAAo para obter e consumir prAximo proxy disponAvel

function getAndConsumeNextProxy() {

  const proxy = getNextAvailableProxy();

  if (proxy) {

    consumeProxy(proxy);

  }

  return proxy;

}



// FunAAo para obter o proxy rotativo Anico

function getRotatingProxy() {

  const rotatingProxyList = document.getElementById('rotating-proxy-list');

  const rotatingProxyListPopup = document.getElementById(

    'rotating-proxy-list-popup',

  );



  // Usar popup se estiver aberto e tiver valor, senAo usar o campo principal

  const activeRotatingField =

    rotatingProxyListPopup && rotatingProxyListPopup.value.trim()

      ? rotatingProxyListPopup

      : rotatingProxyList;



  if (activeRotatingField && activeRotatingField.value.trim()) {

    return activeRotatingField.value.trim();

  }



  return null;

}



// FunAAo para obter chaves PIX adicionadas




// FunAAo para obter extensAes adicionadas

function getAddedExtensions() {

  const extensions = [];



  // Obter extensAes da lista dinAmica

  const extensionsList = document.getElementById('extensions-list');

  if (extensionsList) {

    const extensionElements = extensionsList.querySelectorAll('.font-mono');

    extensionElements.forEach((element) => {

      const extensionPath = element.textContent.trim();

      if (extensionPath !== '') {

        extensions.push(extensionPath);

      }

    });

  }



  return extensions;

}



// FunAAo para obter estados dos toggles

function getToggleStates() {

  const toggles = {};

  const toggleElements = document.querySelectorAll(

    'input[type="checkbox"], .toggle-switch, input[type="radio"]',

  );



  toggleElements.forEach((toggle) => {

    if (toggle.id) {

      if (toggle.type === 'checkbox') {

        toggles[toggle.id] = toggle.checked;

      } else if (toggle.classList.contains('toggle-switch')) {

        toggles[toggle.id] = toggle.classList.contains('active');

      } else if (toggle.type === 'radio') {

        toggles[toggle.id] = toggle.checked;

      }

    }

  });



  return toggles;

}



// FunAAo para carregar links

function loadLinks(links) {

  const linksContainer = document.getElementById('links-container');

  if (!linksContainer) return;



  // Limpar container atual

  linksContainer.innerHTML = '';



  // Adicionar cada link salvo

  links.forEach((link) => {

    addNewLinkInput();

    const inputs = linksContainer.querySelectorAll('input[type="text"]');

    const lastInput = inputs[inputs.length - 1];

    if (lastInput) {

      lastInput.value = link;

    }

  });



  // Atualizar botAo "Criar Contas"

  updateCriarContasButton();

}



// FunAAo para carregar proxies

function loadProxies(proxies) {

  if (!proxies || proxies.length === 0) return;



  // Carregar proxies na lista principal

  const proxyList = document.getElementById('proxy-list');

  if (proxyList) {

    proxyList.value = proxies.join('\n');

  }



  // Carregar proxies na lista do popup

  const proxyListPopup = document.getElementById('proxy-list-popup');

  if (proxyListPopup) {

    proxyListPopup.value = proxies.join('\n');

  }



  // Atualizar contador de proxies

  updateProxyCount();

}



// FunAAo para carregar proxies rotativos

function loadRotatingProxies(rotatingProxies) {

  if (!rotatingProxies || rotatingProxies.length === 0) return;



  // Usar o primeiro proxy rotativo da lista

  const rotatingProxy = rotatingProxies[0];



  // Carregar proxy rotativo no campo principal

  const rotatingProxyList = document.getElementById('rotating-proxy-list');

  if (rotatingProxyList) {

    rotatingProxyList.value = rotatingProxy;

  }



  // Carregar proxy rotativo no campo do popup

  const rotatingProxyListPopup = document.getElementById(

    'rotating-proxy-list-popup',

  );

  if (rotatingProxyListPopup) {

    rotatingProxyListPopup.value = rotatingProxy;

  }

}



// FunAAo para carregar chaves PIX

function loadPixKeys(pixKeys) {

  const pixListPopup = document.getElementById('pix-list-popup');

  if (!pixListPopup) return;



  // Carregar chaves PIX no textarea

  if (pixKeys && pixKeys.length > 0) {

    // Se as chaves sAo objetos com formato {id, tipo, chave}, extrair apenas a chave

    const keysToDisplay = pixKeys.map((key) => {

      if (typeof key === 'object' && key.chave) {

        return key.chave;

      }

      return key; // Manter compatibilidade com formato antigo (string)

    });

    pixListPopup.value = keysToDisplay.join('\n');

  } else {

    pixListPopup.value = '';

  }



  // Atualizar contador

  updatePixCount();

}






// FunAAo para carregar extensAes

function loadExtensions(extensions) {

  if (!extensions || extensions.length === 0) return;



  const extensionsList = document.getElementById('extensions-list');

  if (!extensionsList) return;



  // Limpar lista atual

  extensionsList.innerHTML = '';



  // Adicionar cada extensAo

  extensions.forEach((extensionPath) => {

    const extensionItem = document.createElement('div');

    extensionItem.className =

      'flex items-center justify-between p-2 bg-gray-50 rounded';

    extensionItem.innerHTML = `

            <span class="font-mono text-sm">${extensionPath}</span>

            <button onclick="removeExtension(this)" class="text-red-500 hover:text-red-700">

                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>

                </svg>

            </button>

        `;

    extensionsList.appendChild(extensionItem);

  });



  // Atualizar contador

  updateExtensionCount();

}



// FunAAo para atualizar contador de chaves PIX




// FunAAo para atualizar contadores por tipo de chave PIX




// FunAAo para atualizar contador de extensAes

function updateExtensionCount() {

  const extensionsList = document.getElementById('extensions-list');

  let totalExtensions = 0;



  if (extensionsList) {

    const extensionElements = extensionsList.querySelectorAll('.font-mono');

    totalExtensions = extensionElements.length;

  }



  // Atualizar contador na interface (se existir)

  const extensionCounter = document.getElementById('extension-counter-text');

  if (extensionCounter) {

    extensionCounter.textContent = `${totalExtensions} extensAes carregadas`;

  }



  console.log(`Total de extensAes: ${totalExtensions}`);

}



// FunAAo para aplicar estados dos toggles

function applyToggleStates(toggleStates) {

  Object.keys(toggleStates).forEach((toggleId) => {

    const toggle = document.getElementById(toggleId);

    if (toggle) {

      const isActive = toggleStates[toggleId];



      if (toggle.type === 'checkbox') {

        toggle.checked = isActive;

      } else if (toggle.classList.contains('toggle-switch')) {

        if (isActive) {

          toggle.classList.add('active');

        } else {

          toggle.classList.remove('active');

        }

      } else if (toggle.type === 'radio') {

        toggle.checked = isActive;

      }

    }

  });

}



// FunAAo para atualizar conteAdo do dropdown




// FunAAo para esconder dropdown




// FunAAo para executar navegaAAo com todos os links

async function executeAllLinksNavigation() {

  console.log('Iniciando navegaAAo com todos os links...');



  try {

    // Obter todos os links adicionados

    const links = getAddedLinks();



    if (links.length === 0) {

      showNotification(

        'Nenhum link foi adicionado. Por favor, adicione links primeiro.',

        'warning',

      );

      return;

    }



    // Obter estados do localStorage para filtragem

    let syncStates = null;

    try {

      const savedStates = localStorage.getItem('syncPopupCheckboxStates');

      console.log(

        '[executeAllLinksNavigation] Estados salvos no localStorage:',

        savedStates,

      );

      if (savedStates) {

        syncStates = JSON.parse(savedStates);

        console.log(

          '[executeAllLinksNavigation] Estados parseados:',

          syncStates,

        );

      }

    } catch (error) {

      console.warn('Erro ao carregar estados do localStorage:', error);

    }



    // Obter navegadores ativos com dados de perfil (filtrados pelos estados)

    const activeBrowsersResult =

      await window.electronAPI.getActiveBrowsersWithProfiles(syncStates);



    if (!activeBrowsersResult.success) {

      showNotification(

        'Erro ao verificar navegadores ativos: ' + activeBrowsersResult.error,

        'error',

      );

      return;

    }



    const activeBrowsersWithProfiles = activeBrowsersResult.browsers;

    const activeBrowsers = activeBrowsersWithProfiles.map(

      (browser) => browser.navigatorId,

    );



    if (activeBrowsers.length === 0) {

      showNotification(

        'Nenhum navegador ativo encontrado. Abra os navegadores primeiro usando o botAo "Abrir Navegadores".',

        'warning',

      );

      return;

    }



    // Verificar se hA pelo menos o mesmo nAmero de navegadores para os links

    if (activeBrowsers.length < links.length) {

      showNotification(

        `NAmero insuficiente de navegadores. VocA tem ${links.length} links mas apenas ${activeBrowsers.length} navegador(es) ativo(s). Abra mais navegadores.`,

        'warning',

      );

      return;

    }



    console.log(

      `Encontrados ${activeBrowsers.length} navegadores ativos para ${links.length} links`,

    );



    // Criar array de URLs distribuAdas de forma sequencial natural

    const distributedUrls = [];



    // Distribuir links de forma sequencial (link1, link2, link3, link1, link2, link3...)

    for (let i = 0; i < activeBrowsers.length; i++) {

      const linkIndex = i % links.length;

      distributedUrls.push(links[linkIndex]);

    }



    console.log('DistribuiAAo de URLs:', distributedUrls);



    // Salvar URLs especAficas nos perfis dos navegadores correspondentes

    console.log('Salvando URLs especAficas para cada navegador...');



    // Salvar a URL especAfica para cada navegador baseado na distribuiAAo

    for (let i = 0; i < activeBrowsersWithProfiles.length; i++) {

      const browser = activeBrowsersWithProfiles[i];

      const urlForThisBrowser = distributedUrls[i];



      if (browser.profileId !== null) {

        try {

          const saveUrlResult = await window.electronAPI.saveUrlToProfiles(

            urlForThisBrowser,

            [browser.profileId],

          );

          if (saveUrlResult.success) {

            console.log(

              `URL ${urlForThisBrowser} salva no perfil ${browser.profileId} (navegador ${browser.navigatorId}) com sucesso:`,

              saveUrlResult.message,

            );

          } else {

            console.warn(

              `Falha ao salvar URL ${urlForThisBrowser} no perfil ${browser.profileId}:`,

              saveUrlResult.error,

            );

          }

        } catch (urlSaveError) {

          console.error(

            `Erro ao salvar URL ${urlForThisBrowser} no perfil ${browser.profileId}:`,

            urlSaveError,

          );

        }

      } else {

        console.log(

          `Navegador ${browser.navigatorId} nAo possui perfil associado, URL ${urlForThisBrowser} nAo serA salva.`,

        );

      }

    }



    // Navegar todos os navegadores com as URLs distribuAdas

    const navigationResult = await window.electronAPI.navigateAllBrowsers(

      distributedUrls,

      syncStates,

      {

        scriptName: 'registro',

        waitForLoad: true,

      },

    );



    if (navigationResult.success) {

      const navigationDetails = navigationResult.results || [];

      const successCount =

        navigationDetails.length > 0

          ? navigationDetails.filter((r) => r.success).length

          : activeBrowsers.length;

      const injectionSuccessCount = navigationDetails.filter(

        (r) => r.injection && r.injection.success,

      ).length;

      const injectionFailureCount = navigationDetails.filter(

        (r) =>

          r.injection && r.injection.success === false && !r.injection.skipped,

      ).length;



      showNotification(

        `Navegacao iniciada com sucesso em ${successCount} navegador(es) com ${links.length} link(s) distribuido(s). URLs salvas nos perfis.`,

        'success',

      );



      if (injectionSuccessCount > 0) {

        console.log(

          `[Navegacao] Injecao automatica concluida em ${injectionSuccessCount}/${navigationDetails.length || activeBrowsers.length} navegador(es).`,

        );

      }



      if (injectionFailureCount > 0) {

        showNotification(

          `Aviso: ${injectionFailureCount} navegador(es) falharam na injecao automatica. Consulte o console para detalhes.`,

          'warning',

        );

      }



      if (navigationDetails.length > 0) {

        navigationDetails.forEach((result) => {

          if (result.success) {

            console.log(

              `[Navegacao] Navegador ${result.browserId}: Navegando para ${result.url}`,

            );

          } else {

            console.error(

              `[Navegacao] Navegador ${result.browserId} falhou: ${result.error || 'Falha desconhecida'}`,

            );

          }

        });

      }

    } else {

      showNotification(

        'Erro ao navegar navegadores: ' + navigationResult.error,

        'error',

      );

    }

  } catch (error) {

    console.error(

      'Erro na execuAAo da navegaAAo com todos os links:',

      error,

    );

    showNotification(

      'Erro inesperado ao executar navegaAAo: ' + error.message,

      'error',

    );

  }

}



// FunAAo para executar criaAAo de contas

async function executeAccountCreation(link) {

  console.log('Iniciando criaAAo de contas para:', link);



  try {

    // Obter estados do localStorage para filtragem

    let syncStates = null;

    try {

      const savedStates = localStorage.getItem('syncPopupCheckboxStates');

      console.log(

        '[executeAccountCreation] Estados salvos no localStorage:',

        savedStates,

      );

      if (savedStates) {

        syncStates = JSON.parse(savedStates);

        console.log('[executeAccountCreation] Estados parseados:', syncStates);

      }

    } catch (error) {

      console.warn('Erro ao carregar estados do localStorage:', error);

    }



    // Obter navegadores ativos com dados de perfil (filtrados pelos estados)

    console.log(

      '[executeAccountCreation] Chamando getActiveBrowsersWithProfiles com syncStates:',

      syncStates,

    );

    const activeBrowsersResult =

      await window.electronAPI.getActiveBrowsersWithProfiles(syncStates);



    if (!activeBrowsersResult.success) {

      showNotification(

        'Erro ao verificar navegadores ativos: ' + activeBrowsersResult.error,

        'error',

      );

      return;

    }



    const activeBrowsersWithProfiles = activeBrowsersResult.browsers;



    // Extrair apenas os IDs dos perfis dos navegadores ativos

    const activeProfileIds = activeBrowsersWithProfiles

      .filter((browser) => browser.profileId !== null)

      .map((browser) => browser.profileId);



    console.log('Perfis ativos encontrados:', activeProfileIds);



    // Salvar a URL apenas nos perfis dos navegadores ativos

    try {

      const saveUrlResult = await window.electronAPI.saveUrlToProfiles(

        link,

        activeProfileIds.length > 0 ? activeProfileIds : null,

      );

      if (saveUrlResult.success) {

        console.log(

          'URL salva nos perfis ativos com sucesso:',

          saveUrlResult.message,

        );

      } else {

        console.warn('Falha ao salvar URL nos perfis:', saveUrlResult.error);

      }

    } catch (urlSaveError) {

      console.error('Erro ao salvar URL nos perfis:', urlSaveError);

    }



    // Usar os IDs dos navegadores para verificaAAo

    const activeBrowsers = activeBrowsersWithProfiles.map(

      (browser) => browser.navigatorId,

    );



    if (activeBrowsers.length === 0) {

      showNotification(

        'Nenhum navegador ativo encontrado. Abra os navegadores primeiro usando o botAo "Abrir Navegadores".',

        'warning',

      );

      return;

    }



    console.log(

      `Encontrados ${activeBrowsers.length} navegadores ativos. Navegando para: ${link}`,

    );



    // Navegar todos os navegadores para o link selecionado

    const navigationResult = await window.electronAPI.navigateAllBrowsers(

      link,

      syncStates,

      {

        scriptName: 'registro',

        waitForLoad: true,

      },

    );



    if (navigationResult.success) {

      const navigationDetails = navigationResult.results || [];

      const successCount =

        navigationDetails.length > 0

          ? navigationDetails.filter((r) => r.success).length

          : activeBrowsersWithProfiles.length;

      const injectionSuccessCount = navigationDetails.filter(

        (r) => r.injection && r.injection.success,

      ).length;

      const injectionFailureCount = navigationDetails.filter(

        (r) =>

          r.injection && r.injection.success === false && !r.injection.skipped,

      ).length;



      showNotification(

        `Navegacao iniciada com sucesso em ${successCount} navegador(es) para: ${link}`,

        'success',

      );



      if (injectionSuccessCount > 0) {

        console.log(

          `[Navegacao] Injecao automatica concluida em ${injectionSuccessCount}/${navigationDetails.length || successCount} navegador(es).`,

        );

      }



      if (injectionFailureCount > 0) {

        showNotification(

          `Aviso: ${injectionFailureCount} navegador(es) falharam na injecao automatica. Consulte o console para detalhes.`,

          'warning',

        );

      }



      if (navigationDetails.length > 0) {

        navigationDetails.forEach((result) => {

          if (result.success) {

            console.log(

              `[Navegacao] Navegador ${result.browserId}: Navegando para ${result.url}`,

            );

          } else {

            console.error(

              `[Navegacao] Navegador ${result.browserId} falhou: ${result.error || 'Falha desconhecida'}`,

            );

          }

        });

      }

    } else {

      showNotification(

        'Erro ao navegar navegadores: ' + navigationResult.error,

        'error',

      );

    }

  } catch (error) {

    console.error('Erro na execuAAo da criaAAo de contas:', error);

    showNotification(

      'Erro inesperado ao executar criaAAo de contas: ' + error.message,

      'error',

    );

  }

}



// FunAAo para normalizar URLs no frontend (similar A do backend)




// FunAAo para validar e normalizar URL quando o usuArio digita




function addNewLinkInput() {

  const container = document.getElementById('links-container');

  if (!container) return;



  const linkCount = container.children.length + 1;



  const newLinkGroup = document.createElement('div');

  newLinkGroup.className = 'space-y-2';

  newLinkGroup.id = `link-group-${linkCount}`;



  newLinkGroup.innerHTML = `

        <div class="flex items-center gap-2">

            <div class="flex-1">

                <label for="link-input-${linkCount}" class="block text-white font-medium text-sm mb-1">Link ${linkCount}:</label>

                <input type="text" id="link-input-${linkCount}" class="w-full px-3 py-2 bg-app-gray-800 border border-app-gray-700 rounded-lg text-white placeholder-app-gray-400 focus:outline-none focus:ring-2 focus:ring-app-blue-600 focus:border-transparent transition-all duration-200" placeholder="exemplo.com (https:// serA adicionado automaticamente)">

            </div>

            <button class="w-8 h-8 bg-app-red-600 hover:bg-app-red-500 rounded-lg text-white text-sm font-bold transition-colors duration-200 mt-5" onclick="console.log('BOTAO X CLICADO LINK ${linkCount} (JS)'); window.removeLinkInputGlobal(${linkCount})" title="Remover este campo">A</button>

        </div>

    `;



  container.appendChild(newLinkGroup);



  // Adicionar event listener para atualizar o botAo quando o input mudar

  const newInput = newLinkGroup.querySelector('input');

  if (newInput) {

    newInput.addEventListener('input', () => {

      updateCriarContasButton();

      debouncedSave();

    });

    newInput.addEventListener('blur', () => {

      validateAndNormalizeUrl(newInput);

      removeEmptyLinkInputs();

      updateCriarContasButton();

      debouncedSave();

    });

  }



  updateCriarContasButton();

}



function removeLinkInput(linkNumber) {

  console.log(`Tentando remover link ${linkNumber}`);

  const linkGroup = document.getElementById(`link-group-${linkNumber}`);

  if (linkGroup) {

    linkGroup.remove();

    console.log(`Link ${linkNumber} removido com sucesso`);



    // Reorganizar os IDs dos links restantes

    reorganizeLinkIds();



    updateCriarContasButton();

    debouncedSave();

  } else {

    console.log(`Link group ${linkNumber} nAo encontrado`);

  }

}



// FunAAo para reorganizar os IDs dos links apAs remoAAo

function reorganizeLinkIds() {

  const container = document.getElementById('links-container');

  if (!container) return;



  const linkGroups = container.children;

  for (let i = 0; i < linkGroups.length; i++) {

    const linkGroup = linkGroups[i];

    const newNumber = i + 1;



    // Atualizar ID do grupo

    linkGroup.id = `link-group-${newNumber}`;



    // Atualizar label

    const label = linkGroup.querySelector('label');

    if (label) {

      label.textContent = `Link ${newNumber}:`;

      label.setAttribute('for', `link-input-${newNumber}`);

    }



    // Atualizar input

    const input = linkGroup.querySelector('input');

    if (input) {

      input.id = `link-input-${newNumber}`;

    }



    // Atualizar botAo de remoAAo

    const button = linkGroup.querySelector('button');

    if (button) {

      button.setAttribute(

        'onclick',

        `console.log('BOTAO X CLICADO LINK ${newNumber} (REORGANIZADO)'); window.removeLinkInputGlobal(${newNumber})`,

      );

    }

  }

}



// FunAAo para remover campos de link vazios automaticamente

function removeEmptyLinkInputs() {

  const container = document.getElementById('links-container');

  if (!container) return;



  const linkGroups = Array.from(container.children);

  let removedAny = false;



  // Remover grupos vazios (exceto se for o Anico)

  linkGroups.forEach((linkGroup) => {

    const input = linkGroup.querySelector('input');

    if (input && input.value.trim() === '' && linkGroups.length > 1) {

      linkGroup.remove();

      removedAny = true;

    }

  });



  // Se removeu algum, reorganizar os IDs

  if (removedAny) {

    reorganizeLinkIds();

    updateCriarContasButton();

    debouncedSave();

  }

}



// FunAAo para atualizar o texto e estado do botAo "Criar Contas"

function updateCriarContasButton() {

  const links = getAddedLinks();

  const criarContasText = document.getElementById('criar-contas-text');

  const dropdownArrow = document.getElementById('dropdown-arrow');



  if (criarContasText && dropdownArrow) {

    if (links.length === 0) {

      criarContasText.textContent = 'Criar contas';

      dropdownArrow.classList.add('hidden');

    } else if (links.length === 1) {

      criarContasText.textContent = 'Criar contas (1 link)';

      dropdownArrow.classList.add('hidden');

    } else {

      criarContasText.textContent = `Criar contas (${links.length} links)`;

      dropdownArrow.classList.remove('hidden');

    }

  }

}



// FunAAo global para remoAAo de links (chamada pelo HTML)

if (typeof window !== 'undefined') {
  window.removeLinkInputGlobal = removeLinkInput;
  window.removeExtension = removeExtension;
}


// FunAAes para upload de arquivos

// FunAAo handlePixFileUpload removida - nAo A mais necessAria com o novo formato de textarea



function handleExtensionUpload(event) {

  const files = event.target.files;

  if (files.length > 0) {

    console.log('ExtensAo selecionada:', files[0].webkitRelativePath);

    showNotification('ExtensAo carregada com sucesso!', 'success');



    // Aqui vocA pode processar a extensAo

    displayExtension(files[0].webkitRelativePath);

  }

}



// FunAAo displayPixKeys removida - nAo A mais necessAria com o novo formato de textarea



function displayExtension(path) {

  const extensionsList = document.getElementById('extensions-list');

  if (extensionsList) {

    const extensionElement = document.createElement('div');

    extensionElement.className =

      'flex items-center justify-between p-3 bg-app-gray-800 rounded-lg border border-app-gray-700';

    extensionElement.innerHTML = `

            <span class="text-white text-sm">${path.split('/')[0]}</span>

            <button class="w-6 h-6 bg-app-red-600 hover:bg-app-red-500 rounded text-white text-xs font-bold transition-colors duration-200" onclick="removeExtension(this)" title="Remover extensAo">A</button>

        `;

    extensionsList.appendChild(extensionElement);

    debouncedSave();

  }

}



// FunAAo removePixKey removida - nAo A mais necessAria com o novo formato de textarea



function removeExtension(button) {

  button.parentElement.remove();

  debouncedSave();

}



// FunAAo para atualizar contador de proxies

function updateProxyCount() {

  let totalProxies = 0;



  // Contar proxies da lista normal (usar popup se estiver aberto)

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



  // Nota: Proxy rotativo nAo A contabilizado no contador geral

  // Ele A usado separadamente para todos os navegadores no modo rotativo



  // Atualizar contador

  const proxyCounter = document.getElementById('proxy-counter-text');

  if (proxyCounter) {

    proxyCounter.textContent = `${totalProxies} proxies restantes`;

  }

}



// Gerenciamento de proxies




function initializeProxyManagement() {

  const proxyList = document.getElementById('proxy-list');

  const rotatingProxyList = document.getElementById('rotating-proxy-list');

  const proxyListPopup = document.getElementById('proxy-list-popup');

  const rotatingProxyListPopup = document.getElementById(

    'rotating-proxy-list-popup',

  );

  const proxyCounter = document.getElementById('proxy-counter-text');

  const clearProxiesBtn = document.getElementById('clear-proxies-btn');



  // Sincronizar campos principais com popup

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



  // Event listeners para campos principais

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



  // Event listeners para campos do popup com sincronizaAAo automAtica

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



  // BotAo limpar proxies

  if (clearProxiesBtn) {

    clearProxiesBtn.addEventListener('click', async () => {

      const confirmed = await showCustomConfirm(

        'Tem certeza que deseja limpar todos os proxies?',

      );

      if (confirmed) {

        if (proxyListPopup) proxyListPopup.value = '';

        if (rotatingProxyListPopup) rotatingProxyListPopup.value = '';

        syncPopupToMain();

        debouncedSave();

        showNotification('Proxies limpos com sucesso!', 'success');

      }

    });

  }



  // Sincronizar ao abrir popup

  const proxyPopupOverlay = document.getElementById('proxy-popup-overlay');

  if (proxyPopupOverlay) {

    const observer = new MutationObserver((mutations) => {

      mutations.forEach((mutation) => {

        if (

          mutation.type === 'attributes' &&

          mutation.attributeName === 'class'

        ) {

          if (proxyPopupOverlay.classList.contains('opacity-100')) {

            syncMainToPopup();

          }

        }

      });

    });

    observer.observe(proxyPopupOverlay, { attributes: true });

  }



  // Atualizar contagem inicial

  updateProxyCount();

}



configurePopupsHooks({
  removeEmptyLinkInputs,
  executeAccountCreation,
});

registerSettingsCollectors({

  getLinks: getAddedLinks,

  getProxies: getAddedProxies,

  getRotatingProxy: getRotatingProxy,

  getPixKeys: getAddedPixKeys,

  getExtensions: getAddedExtensions,

  getToggleStates: getToggleStates,

});



registerSettingsLoaders({

  loadLinks,

  loadProxies,

  loadRotatingProxies,

  loadPixKeys,

  loadExtensions,

  updatePixCount,

  updateExtensionCount,

  updateProxyCount,

  applyToggleStates,

});

const LinkPopups = {
  showPopup,
  hidePopup,
  hideLinksDropdown,
  updateLinksDropdownContent,
};

const LinkInputs = {
  addNewLinkInput,
  removeLinkInput,
  reorganizeLinkIds,
  removeEmptyLinkInputs,
  updateCriarContasButton,
};

const LinkData = {
  getAddedLinks,
  getAddedProxies,
  getRotatingProxy,
  getAddedPixKeys,
  getAddedExtensions,
  getToggleStates,
};

const LinkLoaders = {
  loadLinks,
  loadProxies,
  loadRotatingProxies,
  loadPixKeys,
  loadExtensions,
};

const LinkPixAPI = {
  getAddedPixKeys,
  updatePixCount,
  updatePixCountsByType,
  initializePixManagement,
  removeConsumedPixKeys,
};

const LinkExtensionsAPI = {
  getAddedExtensions,
  handleExtensionUpload,
  displayExtension,
  removeExtension,
  updateExtensionCount,
};

const LinkProxiesAPI = {
  getAddedProxies,
  consumeProxy,
  getNextAvailableProxy,
  getAndConsumeNextProxy,
  getRotatingProxy,
  updateProxyCount,
  initializeProxyManagement,
};

const LinkNavigation = {
  toggleLinksDropdown,
  executeAllLinksNavigation,
  executeAccountCreation,
};

const LinkUtils = {
  normalizeUrlFrontend,
  validateAndNormalizeUrl,
};

const LinkAPI = {
  popups: LinkPopups,
  inputs: LinkInputs,
  data: LinkData,
  loaders: LinkLoaders,
  pix: LinkPixAPI,
  extensions: LinkExtensionsAPI,
  proxies: LinkProxiesAPI,
  navigation: LinkNavigation,
  utils: LinkUtils,
};

export {
  initializeLinkManagement,
  LinkAPI,
  LinkPopups,
  LinkInputs,
  LinkData,
  LinkLoaders,
  LinkPixAPI,
  LinkExtensionsAPI,
  LinkProxiesAPI,
  LinkNavigation,
  LinkUtils,
};