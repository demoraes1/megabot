import { showNotification, showCustomConfirm } from '../ui/notifications.js';

import { debouncedSave } from '../settings/autosave.js';

import { showPopup, hidePopup, hideLinksDropdown, updateLinksDropdownContent, configurePopupsHooks } from './groups/popups.js';
import { getAddedPixKeys, updatePixCount, updatePixCountsByType, initializePixManagement, removeConsumedPixKeys } from './groups/pix.js';
import { normalizeUrlFrontend, validateAndNormalizeUrl } from './groups/utils.js';
import {
  addNewLinkInput,
  removeLinkInput,
  reorganizeLinkIds,
  removeEmptyLinkInputs,
  updateCriarContasButton,
} from './groups/link-inputs.js';
import { getAddedLinks, getToggleStates } from './groups/link-data.js';
import {
  getAddedExtensions,
  handleExtensionUpload,
  openExtensionSelector,
  displayExtension,
  removeExtension,
  updateExtensionCount,
} from './groups/extensions.js';
import {
  loadLinks,
  loadProxies,
  loadRotatingProxies,
  loadPixKeys,
  loadExtensions,
} from './groups/link-loaders.js';
import {
  getAddedProxies,
  consumeProxy,
  getNextAvailableProxy,
  getAndConsumeNextProxy,
  getRotatingProxy,
  updateProxyCount,
  initializeProxyManagement,
} from './groups/proxies.js';
import {

  registerSettingsCollectors,

  registerSettingsLoaders,

  saveSettings,

} from '../settings/storage.js';



function initializeLinkManagement() {

  // Botão principal adicionar links (abre popup de URLs)

  const linksBtn = document.getElementById('links-btn');

  if (linksBtn) {

    linksBtn.addEventListener('click', (e) => {

      e.preventDefault();

      showPopup('url-popup-overlay');

    });

  }



  // Botão adicionar link dentro do popup

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



  // Atualizar o botão na inicialização

  updateCriarContasButton();



  // Funcionalidade para chaves PIX

  initializePixManagement();



  // Botão adicionar extensão

  const uploadExtensionBtn = document.getElementById('upload-extension-btn');

  if (uploadExtensionBtn) {

    uploadExtensionBtn.addEventListener('click', () => {

      openExtensionSelector();

    });

  }



  // Input de arquivo PIX

  const pixFileInput = document.getElementById('pix-file-input');

  if (pixFileInput) {

    pixFileInput.addEventListener('change', handlePixFileUpload);

  }



  // Input de extensão

  const extensionInput = document.getElementById('extension-folder-input');

  if (extensionInput) {

    extensionInput.addEventListener('change', handleExtensionUpload);

  }



  // Funcionalidade para proxies

  initializeProxyManagement();

}



// Funções auxiliares







function toggleLinksDropdown() {

  const links = getAddedLinks();

  const dropdown = document.getElementById('links-dropdown');

  const arrow = document.getElementById('dropdown-arrow');

  const criarContasBtn = document.getElementById('criar-contas-btn');

  const criarContasText = document.getElementById('criar-contas-text');



  // Se não há links, mostrar mensagem

  if (links.length === 0) {

    showNotification(

      'Nenhum link foi adicionado. Por favor, adicione links primeiro.',

      'warning',

    );

    return;

  }



  // Se há apenas um link, executar diretamente

  if (links.length === 1) {

    console.log('Executando criação de contas com link único:', links[0]);

    executeAccountCreation(links[0]);

    return;

  }



  // Se há múltiplos links, mostrar dropdown

  if (dropdown && arrow && criarContasBtn) {

    // Atualizar conteúdo do dropdown

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



// Função para obter chaves PIX adicionadas






// Função para atualizar contador de chaves PIX




// Função para atualizar contadores por tipo de chave PIX




// Função para atualizar contador de extensões





// Função para aplicar estados dos toggles

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



// Função para atualizar conteúdo do dropdown




// Função para esconder dropdown




// Função para executar navegação com todos os links

async function executeAllLinksNavigation() {

  console.log('Iniciando navegação com todos os links...');



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

    const profilesResult =

      await window.electronAPI.generateProfilesForBrowsers(

        syncStates,

        { regenerate: true },

      );



    if (!profilesResult.success) {

      if (profilesResult.error === 'Nenhum navegador ativo encontrado') {

        showNotification(

          'Nenhum navegador ativo encontrado. Abra os navegadores primeiro usando o botão "Abrir Navegadores".',

          'warning',

        );

      } else {

        const errorMessage =

          profilesResult.error || 'Não foi possível gerar dados de perfis.';

        showNotification(

          'Erro ao preparar perfis ativos: ' + errorMessage,

          'error',

        );

      }

      return;

    }



    const activeBrowsersWithProfiles = profilesResult.browsers || [];

    if (profilesResult.generatedProfiles > 0) {

      console.log(

        `[executeAllLinksNavigation] ${profilesResult.generatedProfiles} perfis regenerados.`,

      );

    }



    const activeBrowsers = activeBrowsersWithProfiles.map(

      (browser) => browser.navigatorId,

    );



    if (activeBrowsers.length === 0) {

      showNotification(

        'Nenhum navegador ativo encontrado. Abra os navegadores primeiro usando o botão "Abrir Navegadores".',

        'warning',

      );

      return;

    }



    // Verificar se há pelo menos o mesmo número de navegadores para os links

    if (activeBrowsers.length < links.length) {

      showNotification(

        `Número insuficiente de navegadores. Você tem ${links.length} links mas apenas ${activeBrowsers.length} navegador(es) ativo(s). Abra mais navegadores.`,

        'warning',

      );

      return;

    }



    console.log(

      `Encontrados ${activeBrowsers.length} navegadores ativos para ${links.length} links`,

    );



    // Criar array de URLs distribuídas de forma sequencial natural

    const distributedUrls = [];



    // Distribuir links de forma sequencial (link1, link2, link3, link1, link2, link3...)

    for (let i = 0; i < activeBrowsers.length; i++) {

      const linkIndex = i % links.length;

      distributedUrls.push(links[linkIndex]);

    }



    console.log('Distribuição de URLs:', distributedUrls);



    // Salvar URLs específicas nos perfis dos navegadores correspondentes

    console.log('Salvando URLs específicas para cada navegador...');



    // Salvar a URL específica para cada navegador baseado na distribuição
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
          `Navegador ${browser.navigatorId} não possui perfil associado, URL ${urlForThisBrowser} não será salva.`,
        );

      }

    }



    // Navegar todos os navegadores com as URLs distribuídas

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

        `Navegação iniciada com sucesso em ${successCount} navegador(es) com ${links.length} link(s) distribuído(s). URLs salvas nos perfis.`,

        'success',

      );



      if (injectionSuccessCount > 0) {

        console.log(

          `[Navegação] Injeção automática concluída em ${injectionSuccessCount}/${navigationDetails.length || activeBrowsers.length} navegador(es).`,

        );

      }



      if (injectionFailureCount > 0) {

        showNotification(

          `Aviso: ${injectionFailureCount} navegador(es) falharam na injeção automática. Consulte o console para detalhes.`,

          'warning',

        );

      }



      if (navigationDetails.length > 0) {

        navigationDetails.forEach((result) => {

          if (result.success) {

            console.log(

              `[Navegação] Navegador ${result.browserId}: Navegando para ${result.url}`,

            );

          } else {

            console.error(

              `[Navegação] Navegador ${result.browserId} falhou: ${result.error || 'Falha desconhecida'}`,

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

      'Erro na execução da navegação com todos os links:',

      error,

    );

    showNotification(

      'Erro inesperado ao executar navegação: ' + error.message,

      'error',

    );

  }

}



// Função para executar criação de contas

async function executeAccountCreation(link) {

  console.log('Iniciando criação de contas para:', link);



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

      '[executeAccountCreation] Chamando generateProfilesForBrowsers com syncStates:',

      syncStates,

    );

    const profilesResult =

      await window.electronAPI.generateProfilesForBrowsers(

        syncStates,

        { regenerate: true },

      );



    if (!profilesResult.success) {

      if (profilesResult.error === 'Nenhum navegador ativo encontrado') {

        showNotification(

          'Nenhum navegador ativo encontrado. Abra os navegadores primeiro usando o botão "Abrir Navegadores".',

          'warning',

        );

      } else {

        const errorMessage =

          profilesResult.error || 'Não foi possível gerar dados de perfis.';

        showNotification(

          'Erro ao preparar perfis ativos: ' + errorMessage,

          'error',

        );

      }

      return;

    }



    const activeBrowsersWithProfiles = profilesResult.browsers || [];

    if (profilesResult.generatedProfiles > 0) {

      console.log(

        `[executeAccountCreation] ${profilesResult.generatedProfiles} perfis regenerados.`,

      );

    }



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



    // Usar os IDs dos navegadores para verificação

    const activeBrowsers = activeBrowsersWithProfiles.map(

      (browser) => browser.navigatorId,

    );



    if (activeBrowsers.length === 0) {

      showNotification(

        'Nenhum navegador ativo encontrado. Abra os navegadores primeiro usando o botão "Abrir Navegadores".',

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

        `Navegação iniciada com sucesso em ${successCount} navegador(es) para: ${link}`,

        'success',

      );



      if (injectionSuccessCount > 0) {

        console.log(

          `[Navegação] Injeção automática concluída em ${injectionSuccessCount}/${navigationDetails.length || successCount} navegador(es).`,

        );

      }



      if (injectionFailureCount > 0) {

        showNotification(

          `Aviso: ${injectionFailureCount} navegador(es) falharam na injeção automática. Consulte o console para detalhes.`,

          'warning',

        );

      }



      if (navigationDetails.length > 0) {

        navigationDetails.forEach((result) => {

          if (result.success) {

            console.log(

              `[Navegação] Navegador ${result.browserId}: Navegando para ${result.url}`,

            );

          } else {

            console.error(

              `[Navegação] Navegador ${result.browserId} falhou: ${result.error || 'Falha desconhecida'}`,

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

    console.error('Erro na execução da criação de contas:', error);

    showNotification(

      'Erro inesperado ao executar criação de contas: ' + error.message,

      'error',

    );

  }

}



// Função para normalizar URLs no frontend (similar à do backend)




// Função para validar e normalizar URL quando o usuário digita




// Função global para remoção de links (chamada pelo HTML)

if (typeof window !== 'undefined') {
  window.removeLinkInputGlobal = removeLinkInput;
  window.removeExtension = removeExtension;
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
  openExtensionSelector,
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


