(async function() {
    'use strict';

    // =================================================================================
    // --- ÁREA DE CONFIGURAÇÃO ---
    // =================================================================================
    const config = {
        // --- Seletores da Interface (DOM) ---
        selectors: {
            // Etapa 1: Cabeçalho da Seção de Jogos
            sectionHeader: 'section[class*="_game-headline_"]',
            sectionTitle: 'p[class*="_title-text_"]',
            seeAllButtonContainer: 'div[class*="_click-area_"]',
            seeAllButtonText: 'Tudo', // Texto do botão para ver todos

            // Etapa 2: Pesquisa
            searchInput: 'input[placeholder="Pesquisar"]',

            // Etapa 3: Resultados da Pesquisa
            gameNameElement: 'h4',
            gameContainer: 'div[class*="_poster-box_"]'
        },

        // --- Configurações de Atraso (Delays em milissegundos) ---
        delays: {
            afterSeeAllClick: 1500,
            afterSearchInput: 1500
        },
    };
    // =================================================================================
    // --- FIM DA ÁREA DE CONFIGURAÇÃO ---
    // =================================================================================

    // Função auxiliar para criar uma pausa
    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Função principal que executa todas as etapas
    async function findAndClickGame() {
      try {
        // --- ETAPA 0: Validar e obter dados do sistema ---
        if (!window.megabotConfig || !window.megabotConfig.categoria || !window.megabotConfig.jogo) {
            console.error('ERRO: Dados essenciais (categoria e jogo) não foram fornecidos pelo sistema em window.megabotConfig. Abortando script.');
            return; // Para a execução
        }
        
        const categoryToSearch = window.megabotConfig.categoria;
        const gameToSearch = window.megabotConfig.jogo;

        console.log(`--- Iniciando automação para Categoria: "${categoryToSearch}", Jogo: "${gameToSearch}" ---`);

        // --- ETAPA 1: Clicar no botão "Tudo" da categoria correta ---
        console.log(`Etapa 1: Procurando pela seção de ${categoryToSearch} e seu botão "${config.selectors.seeAllButtonText}"...`);
        const allSectionHeaders = Array.from(document.querySelectorAll(config.selectors.sectionHeader));
        let tudoButton = null;

        for (const header of allSectionHeaders) {
          const titleElement = header.querySelector(config.selectors.sectionTitle);
          if (titleElement && titleElement.innerText.trim().toLowerCase() === categoryToSearch.toLowerCase()) {
            console.log('Encontrada a seção correta. Procurando o botão "Tudo" dentro dela.');
            const clickableArea = Array.from(header.querySelectorAll(config.selectors.seeAllButtonContainer))
                                    .find(div => div.innerText && div.innerText.trim() === config.selectors.seeAllButtonText);
            if (clickableArea) {
                tudoButton = clickableArea;
                break;
            }
          }
        }

        if (!tudoButton) {
          console.error(`ERRO: Botão "${config.selectors.seeAllButtonText}" na seção de ${categoryToSearch} não foi encontrado.`);
          return;
        }

        tudoButton.click();
        console.log('SUCESSO: Botão "Tudo" clicado.');
        await sleep(config.delays.afterSeeAllClick);

        // --- ETAPA 2: Digitar o nome do jogo no campo de pesquisa ---
        console.log('Etapa 2: Procurando pelo campo de pesquisa...');
        const searchInput = document.querySelector(config.selectors.searchInput);

        if (!searchInput) {
          console.error('ERRO: Campo de pesquisa não foi encontrado.');
          return;
        }
        
        searchInput.value = gameToSearch;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`SUCESSO: Digitado "${gameToSearch}" no campo de pesquisa.`);
        await sleep(config.delays.afterSearchInput);

        // --- ETAPA 3: Clicar na imagem do jogo ---
        console.log(`Etapa 3: Procurando pelo jogo "${gameToSearch}" nos resultados...`);
        const allGameNames = Array.from(document.querySelectorAll(config.selectors.gameNameElement));
        const gameNameElement = allGameNames.find(h4 => h4.innerText && h4.innerText.trim().toLowerCase() === gameToSearch.toLowerCase());
        
        if (!gameNameElement) {
          console.error(`ERRO: Jogo "${gameToSearch}" não encontrado nos resultados da pesquisa.`);
          return;
        }

        const gameContainer = gameNameElement.closest(config.selectors.gameContainer);
        
        if (!gameContainer) {
            console.error(`ERRO: Container clicável do jogo "${gameToSearch}" não foi encontrado.`);
            return;
        }

        gameContainer.click();
        console.log(`SUCESSO FINAL: Jogo "${gameToSearch}" foi clicado!`);

      } catch (error) {
        console.error('Ocorreu um erro inesperado durante a automação:', error);
      }
    }

    // Inicia a automação
    findAndClickGame();

})();