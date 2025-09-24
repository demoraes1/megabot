import { debouncedSave } from '../../settings/autosave.js';
import { validateAndNormalizeUrl } from './utils.js';
import { getAddedLinks } from './link-data.js';

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

    reorganizeLinkIds();
    updateCriarContasButton();
    debouncedSave();
  } else {
    console.log(`Link group ${linkNumber} nAo encontrado`);
  }
}

function reorganizeLinkIds() {
  const container = document.getElementById('links-container');
  if (!container) return;

  const linkGroups = container.children;
  for (let i = 0; i < linkGroups.length; i++) {
    const linkGroup = linkGroups[i];
    const newNumber = i + 1;

    linkGroup.id = `link-group-${newNumber}`;

    const label = linkGroup.querySelector('label');
    if (label) {
      label.textContent = `Link ${newNumber}:`;
      label.setAttribute('for', `link-input-${newNumber}`);
    }

    const input = linkGroup.querySelector('input');
    if (input) {
      input.id = `link-input-${newNumber}`;
    }

    const button = linkGroup.querySelector('button');
    if (button) {
      button.setAttribute(
        'onclick',
        `console.log('BOTAO X CLICADO LINK ${newNumber} (REORGANIZADO)'); window.removeLinkInputGlobal(${newNumber})`,
      );
    }
  }
}

function removeEmptyLinkInputs() {
  const container = document.getElementById('links-container');
  if (!container) return;

  const linkGroups = Array.from(container.children);
  let removedAny = false;

  linkGroups.forEach((linkGroup) => {
    const input = linkGroup.querySelector('input');
    if (input && input.value.trim() === '' && linkGroups.length > 1) {
      linkGroup.remove();
      removedAny = true;
    }
  });

  if (removedAny) {
    reorganizeLinkIds();
    updateCriarContasButton();
    debouncedSave();
  }
}

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

export {
  addNewLinkInput,
  removeLinkInput,
  reorganizeLinkIds,
  removeEmptyLinkInputs,
  updateCriarContasButton,
};
