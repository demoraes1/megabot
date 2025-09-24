let removeEmptyLinkInputsHook = () => {};
let executeAccountCreationHook = (link) => {
  console.warn('executeAccountCreation hook not configured', link);
};

export function configurePopupsHooks({ removeEmptyLinkInputs, executeAccountCreation }) {
  if (typeof removeEmptyLinkInputs === 'function') {
    removeEmptyLinkInputsHook = removeEmptyLinkInputs;
  }
  if (typeof executeAccountCreation === 'function') {
    executeAccountCreationHook = executeAccountCreation;
  }
}

export function showPopup(popupId) {
  const popup = document.getElementById(popupId);
  if (popup) {
    popup.classList.remove('opacity-0', 'invisible');
    popup.classList.add('opacity-100', 'visible');
    const sidebar = popup.querySelector('.transform');
    if (sidebar) {
      sidebar.classList.remove('translate-x-full');
      sidebar.classList.add('translate-x-0');
    }
  }
}

export function hidePopup(popupId) {
  const popup = document.getElementById(popupId);
  if (popup) {
    const sidebar = popup.querySelector('.transform');
    if (sidebar) {
      sidebar.classList.remove('translate-x-0');
      sidebar.classList.add('translate-x-full');
    }

    if (popupId === 'links-popup') {
      removeEmptyLinkInputsHook();
    }

    setTimeout(() => {
      popup.classList.remove('opacity-100', 'visible');
      popup.classList.add('opacity-0', 'invisible');
    }, 300);
  }
}

export function updateLinksDropdownContent(links) {
  const dropdownContent = document.getElementById('links-dropdown-content');
  if (!dropdownContent) {
    return;
  }

  dropdownContent.innerHTML = '';
  links.forEach((link, index) => {
    const linkItem = document.createElement('div');
    linkItem.className =
      'px-4 py-2 hover:bg-app-gray-700 cursor-pointer text-white text-sm transition-colors duration-200';
    linkItem.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="truncate flex-1 mr-2">${link}</span>
                <span class="text-xs text-app-gray-400">${index + 1}</span>
            </div>
        `;

    linkItem.addEventListener('click', () => {
      console.log('Executando criacao de contas com link selecionado:', link);
      executeAccountCreationHook(link);
      hideLinksDropdown();
    });

    dropdownContent.appendChild(linkItem);
  });
}

export function hideLinksDropdown() {
  const dropdown = document.getElementById('links-dropdown');
  const arrow = document.getElementById('dropdown-arrow');
  const criarContasBtn = document.getElementById('criar-contas-btn');
  const criarContasText = document.getElementById('criar-contas-text');

  if (dropdown && arrow && criarContasBtn) {
    dropdown.classList.add('hidden');
    arrow.style.transform = 'rotate(0deg)';
    criarContasBtn.classList.remove('dropdown-active');
    if (criarContasText) {
      criarContasText.textContent = 'Criar contas';
    }
  }
}
