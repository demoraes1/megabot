import { initializeProfilesTab } from '../profiles/index.js';

function initializeTabSystem() {
  const tabButtons = document.querySelectorAll('[data-tab]');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const targetTab = button.getAttribute('data-tab');

      tabButtons.forEach((btn) => {
        btn.classList.remove('bg-app-blue-700', 'text-white', 'shadow-lg');
        btn.classList.add(
          'text-app-gray-400',
          'hover:text-white',
          'hover:bg-app-gray-700',
        );
      });

      button.classList.remove(
        'text-app-gray-400',
        'hover:text-white',
        'hover:bg-app-gray-700',
      );
      button.classList.add('bg-app-blue-700', 'text-white', 'shadow-lg');

      tabContents.forEach((content) => {
        content.classList.add('hidden');
      });

      const targetContent = document.getElementById(`tab-${targetTab}`);
      if (!targetContent) {
        return;
      }

      targetContent.classList.remove('hidden');

      if (targetTab === 'contas') {
        await initializeProfilesTab();
      }
    });
  });
}

export { initializeTabSystem };
