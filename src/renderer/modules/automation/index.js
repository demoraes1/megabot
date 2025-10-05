import { showNotification, showCustomConfirm } from '../ui/notifications.js';
import { debouncedSave } from '../settings/autosave.js';
import { mapPixKeyTypeToFile } from '../settings/storage.js';
import { LinkPopups, LinkNavigation, LinkPixAPI } from '../links/index.js';
import { state } from '../state.js';
import { atualizarPaginas } from '../browser/actions.js';
import { abrirNavegadores } from '../monitors/index.js';

const { showPopup, hidePopup, hideLinksDropdown } = LinkPopups;
const { toggleLinksDropdown, executeAllLinksNavigation } = LinkNavigation;
const { getAddedPixKeys, removeConsumedPixKeys } = LinkPixAPI;
let automationSettingsInitialized = false;

function initializeButtons() {
  const mainButtons = [
    { id: 'create-accounts-btn', action: () => console.log('Criar contas') },
    { id: 'withdraw-btn', action: () => console.log('Saque') },
    { id: 'deposit-btn', action: () => console.log('Depositar') },
    { id: 'play-btn', action: () => console.log('Jogar') },
    { id: 'refresh-pages-btn', action: () => atualizarPaginas() },
    { id: 'mirror-mode-btn', action: () => console.log('Modo Espelho') },
    {
      id: 'manage-extensions-btn',
      action: () => showPopup('extensions-popup-overlay'),
    },
    {
      id: 'sync-btn',
      action: () => {
        console.log('Botão de sincronização clicado');
        if (window.syncPopup) {
          console.log('window.syncPopup encontrado, abrindo popup...');
          window.syncPopup.open();
        } else {
          console.error('window.syncPopup não encontrado!');
        }
      },
    },
    { id: 'pix-btn', action: () => showPopup('pix-popup-overlay') },
    { id: 'add-proxies-btn', action: () => showPopup('proxy-popup-overlay') },
    // Nota: home-btn e reports-btn agora usam o sistema padronizado de injeção
  ];

  mainButtons.forEach(({ id, action }) => {
    const button = document.getElementById(id);
    if (button) {
      button.addEventListener('click', action);
    }
  });

  // Sistema padronizado de injeção de scripts
  initializeScriptInjectionButtons();

  // Botão Criar Contas (funcionalidade especial)
  const criarContasBtn = document.getElementById('criar-contas-btn');
  if (criarContasBtn) {
    criarContasBtn.addEventListener('click', () => {
      console.log('Criar contas clicado');
      toggleLinksDropdown();
    });
  }

  // Botão All (carregar todos os links sequencialmente)
  const allBtn = document.getElementById('all-btn');
  if (allBtn) {
    allBtn.addEventListener('click', () => {
      console.log('Botão All clicado');
      executeAllLinksNavigation();
    });
  }

  // Botão Abrir Navegadores
  const openBrowsersBtn = document.getElementById('open-browsers-btn');
  if (openBrowsersBtn) {
    openBrowsersBtn.addEventListener('click', async () => {
      await abrirNavegadores();
    });
  }

  // Botão Excluir Todos os Perfis
  const deleteAllProfilesBtn = document.getElementById(
    'delete-all-profiles-btn',
  );
  if (deleteAllProfilesBtn) {
    deleteAllProfilesBtn.addEventListener('click', async () => {
      const confirmed = await showCustomConfirm(
        'Tem certeza que deseja excluir TODOS os perfis? Esta ação não pode ser desfeita e irá apagar todas as pastas de perfis e limpar o config.json.',
      );
      if (confirmed) {
        try {
          // Mostrar barra de progressão
          showDeleteProgress();

          // Configurar listener para progresso
          window.electronAPI.onDeleteProgress((progressData) => {
            updateDeleteProgress(progressData);
          });

          const result = await window.electronAPI.deleteAllProfiles();

          if (result.success) {
            // Aguardar um pouco para mostrar conclusão
            setTimeout(() => {
              hideDeleteProgress();
              showNotification(
                'Todos os perfis foram excluídos com sucesso',
                'success',
              );
              // Limpar dados locais imediatamente
              profilesData = [];
              filteredProfilesData = [];
              // Renderizar cards filtrados imediatamente
              renderFilteredProfileCards();
            }, 1000);
          } else {
            hideDeleteProgress();
            showNotification(
              `Erro ao excluir perfis: ${result.error}`,
              'error',
            );
          }
        } catch (error) {
          console.error('Erro ao excluir todos os perfis:', error);
          hideDeleteProgress();
          showNotification('Erro ao excluir todos os perfis', 'error');
        } finally {
          // Remover listener
          window.electronAPI.removeDeleteProgressListener();
        }
      }
    });
  }
}

// Sistema padronizado de injeção de scripts
// Função para verificar se há chaves PIX do tipo selecionado
function hasPixKeysOfSelectedType() {
  const selectedType = document.getElementById('pix-key-type')?.value || 'cpf';
  const mappedType = mapPixKeyTypeToFile(selectedType);

  // Obter chaves PIX atuais
  const pixKeys = getAddedPixKeys();

  // Verificar se hA chaves do tipo selecionado
  const keysOfSelectedType = pixKeys.filter((key) => {
    if (typeof PixValidator !== 'undefined') {
      const validator = new PixValidator();
      const identifiedType = validator.identifyPixKeyType(key.chave);

      // Mapear tipos do PixValidator para os tipos do arquivo
      const typeMapping = {
        CPF: 'CPF',
        CNPJ: 'CNPJ',
        'E-mail': 'EMAIL',
        Telefone: 'PHONE',
        'Chave Aleatória': 'EVP',
      };

      return typeMapping[identifiedType] === mappedType;
    }
    return false;
  });

  return keysOfSelectedType.length > 0;
}

function initializeScriptInjectionButtons() {
  // Busca todos os botões com data-inject-script
  const scriptButtons = document.querySelectorAll('[data-inject-script]');

  scriptButtons.forEach((button) => {
    const scriptName = button.getAttribute('data-inject-script');
    const notificationMessage =
      button.getAttribute('data-notification') ||
      `Script ${scriptName} executado`;
    const confirmMessage = button.getAttribute('data-confirm');

    button.addEventListener('click', async () => {
      try {
        if (confirmMessage && !(await showCustomConfirm(confirmMessage))) {
          return;
        }

        const syncStates = JSON.parse(
          localStorage.getItem('syncPopupCheckboxStates') || '{}',
        );
        console.log(`[${scriptName}] syncStates obtidos:`, syncStates);

        if (scriptName === 'saque') {
          const selectedTypeElement = document.getElementById('pix-key-type');
          const selectedTypeValue = selectedTypeElement?.value || 'cpf';
          const selectedTypeText =
            selectedTypeElement?.options[selectedTypeElement.selectedIndex]
              ?.text || 'selecionado';
          const mappedType = mapPixKeyTypeToFile(selectedTypeValue);

          const assignmentStatus = await window.electronAPI.checkPixAssignments(
            mappedType,
            syncStates,
          );
          if (assignmentStatus?.success === false) {
            showNotification(
              assignmentStatus.error || 'Erro ao validar chaves PIX.',
              'error',
            );
            return;
          }

          if (
            !assignmentStatus?.allProfilesHavePix &&
            !hasPixKeysOfSelectedType()
          ) {
            const missingProfiles = (assignmentStatus?.profilesWithoutPix || [])
              .map((profile) => profile.profileId || profile.navigatorId)
              .filter(Boolean);
            const missingInfo =
              missingProfiles.length > 0
                ? ` Perfis sem chave: ${missingProfiles.join(', ')}`
                : '';
            showNotification(
              `Erro: Não há chaves PIX do tipo "${selectedTypeText}" disponíveis.` +
                missingInfo,
              'error',
            );
            return;
          }

          const reservationResult =
            await window.electronAPI.reservePixKeysForWithdraw(
              mappedType,
              syncStates,
            );
          if (!reservationResult?.success) {
            const errorMessage =
              reservationResult?.error ||
              'Erro ao reservar chaves PIX para saque.';
            showNotification(errorMessage, 'error');
            return;
          }

          if (
            Array.isArray(reservationResult?.consumedKeys) &&
            reservationResult.consumedKeys.length > 0
          ) {
            removeConsumedPixKeys(reservationResult.consumedKeys);
          }
        }

        await window.electronAPI.injectScript(scriptName, syncStates);

        // Mostra notificação de sucesso
        showNotification(notificationMessage, 'success');

        console.log(
          `Script ${scriptName} injetado com sucesso em todos os navegadores`,
        );
      } catch (error) {
        console.error(`Erro ao injetar script ${scriptName}:`, error);
        showNotification(`Erro ao executar script ${scriptName}`, 'error');
      }
    });
  });
}

// Função para injetar script customizado
async function injectCustomScript(
  scriptCode,
  notificationMessage = 'Script customizado executado',
) {
  try {
    const syncStates = JSON.parse(
      localStorage.getItem('syncPopupCheckboxStates') || 'null',
    );
    await window.electronAPI.injectCustomScript(scriptCode, syncStates);
    showNotification(notificationMessage, 'success');
    console.log('Script customizado injetado com sucesso');
  } catch (error) {
    console.error('Erro ao injetar script customizado:', error);
    showNotification('Erro ao executar script customizado', 'error');
  }
}

// Sistema de popups
function initializePopups() {
  // Fechar popups
  const closeButtons = [
    'close-url-popup',
    'close-pix-popup',
    'close-extensions-popup',
    'close-proxy-popup',
  ];

  closeButtons.forEach((buttonId) => {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener('click', () => {
        const popup = button.closest('[id$="-popup-overlay"]');
        if (popup) {
          hidePopup(popup.id);
        }
      });
    }
  });

  // Fechar popup clicando no overlay
  const overlays = document.querySelectorAll('[id$="-popup-overlay"]');
  overlays.forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        hidePopup(overlay.id);
      }
    });
  });

  // Fechar dropdown de links clicando fora dele
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('links-dropdown');
    const criarContasBtn = document.getElementById('criar-contas-btn');

    if (dropdown && criarContasBtn && !dropdown.classList.contains('hidden')) {
      if (!criarContasBtn.contains(e.target) && !dropdown.contains(e.target)) {
        hideLinksDropdown();
      }
    }
  });
}

// Contadores (delay, instâncias)
function initializeCounters() {
  // Contador de delay
  const decreaseDelay = document.getElementById('decrease-delay');
  const increaseDelay = document.getElementById('increase-delay');
  const delayCount = document.getElementById('delay-count');

  if (decreaseDelay && increaseDelay && delayCount) {
    decreaseDelay.addEventListener('click', () => {
      let current = parseInt(delayCount.textContent);
      if (current > 1) {
        delayCount.textContent = current - 1;
        debouncedSave();
      }
    });

    increaseDelay.addEventListener('click', () => {
      let current = parseInt(delayCount.textContent);
      if (current < 60) {
        delayCount.textContent = current + 1;
        debouncedSave();
      }
    });
  }

  // Contador de aberturas simultâneas
  const decreaseOpenings = document.getElementById('decrease-openings');
  const increaseOpenings = document.getElementById('increase-openings');
  const openingsCount = document.getElementById('openings-count');

  if (decreaseOpenings && increaseOpenings && openingsCount) {
    decreaseOpenings.addEventListener('click', () => {
      let current = parseInt(openingsCount.textContent);
      if (current > 1) {
        openingsCount.textContent = current - 1;
        debouncedSave();
      }
    });

    increaseOpenings.addEventListener('click', () => {
      let current = parseInt(openingsCount.textContent);
      if (current < state.monitors.maxCapacity) {
        openingsCount.textContent = current + 1;
        debouncedSave();
      }
    });
  }
}

function initializeAutomationSettingsControls() {
  if (automationSettingsInitialized) {
    return;
  }

  if (typeof document === 'undefined') {
    automationSettingsInitialized = true;
    return;
  }

  const scheduleSave = () => debouncedSave();
  const bind = (element, events = ['change']) => {
    if (!element) {
      return;
    }

    events.forEach((eventName) => {
      element.addEventListener(eventName, scheduleSave);
    });
  };

  const generateWithdrawToggle = document.getElementById('generate-withdraw-toggle');
  bind(generateWithdrawToggle);

  const muteAudioToggle = document.getElementById('mute-audio-toggle');
  bind(muteAudioToggle);

  const depositMinInput = document.getElementById('deposit-min');
  bind(depositMinInput, ['input', 'change']);

  const depositMaxInput = document.getElementById('deposit-max');
  bind(depositMaxInput, ['input', 'change']);

  const passwordField = document.getElementById('password-field');
  bind(passwordField, ['input']);

  const withdrawPasswordField = document.getElementById('withdraw-password-field');
  bind(withdrawPasswordField, ['input']);

  const randomPasswordsToggle = document.getElementById('random-passwords-toggle');
  bind(randomPasswordsToggle);

  const categoriaField = document.getElementById('categoria-field');
  bind(categoriaField);

  const jogoField = document.getElementById('jogo-field');
  bind(jogoField, ['input', 'change']);

  const pixKeyTypeField = document.getElementById('pix-key-type');
  bind(pixKeyTypeField);

  const delayToggle = document.getElementById('delay-toggle');
  if (delayToggle) {
    delayToggle.addEventListener('change', () => {
      const delayControls = document.getElementById('delay-controls');
      if (delayControls) {
        if (delayToggle.checked) {
          delayControls.classList.remove('hidden');
        } else {
          delayControls.classList.add('hidden');
        }
      }

      debouncedSave();
    });
  }

  automationSettingsInitialized = true;
}

if (typeof window !== 'undefined') {
  window.injectCustomScript = injectCustomScript;
}

export {
  initializeButtons,
  initializePopups,
  initializeCounters,
  initializeAutomationSettingsControls,
  initializeScriptInjectionButtons,
  injectCustomScript,
};




