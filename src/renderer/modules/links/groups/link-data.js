import { normalizeUrlFrontend } from './utils.js';

function getAddedLinks() {
  const linksContainer = document.getElementById('links-container');
  const links = [];

  if (linksContainer) {
    const linkInputs = linksContainer.querySelectorAll('input[type="text"]');
    linkInputs.forEach((input) => {
      const value = input.value.trim();
      if (value) {
        const normalizedUrl = normalizeUrlFrontend(value);
        links.push(normalizedUrl);
        console.log(`Link coletado e normalizado: ${value} -> ${normalizedUrl}`);
      }
    });
  }

  return links;
}

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

export { getAddedLinks, getToggleStates };
