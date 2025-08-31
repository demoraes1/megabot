// Função auxiliar para criar uma pausa, facilitando a leitura do código
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Função principal que executa todas as etapas
async function findAndClickGame() {
  try {
    // --- ETAPA 1: Clicar na categoria "Slots" no menu lateral ---
    console.log('Etapa 1: Procurando pela categoria "Slots"...');
    const allMenuItems = Array.from(document.querySelectorAll('p'));
    const slotsCategory = allMenuItems.find(p => p.innerText && p.innerText.trim() === 'Slots');

    if (!slotsCategory) {
      console.error('ERRO: Categoria "Slots" não encontrada no menu lateral.');
      return; // Para a execução se não encontrar
    }
    slotsCategory.click();
    console.log('SUCESSO: Categoria "Slots" clicada.');
    await sleep(1500); // Espera 1.5 segundos para o conteúdo da página de slots carregar

    // --- ETAPA 2: Clicar no botão "Tudo" dentro da área de Slots ---
    console.log('Etapa 2: Procurando pelo botão "Tudo"...');
    const allDivs = Array.from(document.querySelectorAll('div'));
    const tudoButton = allDivs.find(div => div.innerText && div.innerText.trim() === 'Tudo' && div.classList.contains('_click-area_14vs5_56'));

    if (!tudoButton) {
      console.error('ERRO: Botão "Tudo" não encontrado. A página de Slots pode não ter carregado corretamente.');
      return;
    }
    tudoButton.click();
    console.log('SUCESSO: Botão "Tudo" clicado.');
    await sleep(1000); // Espera 1 segundo para a página de pesquisa aparecer

    // --- ETAPA 3: Digitar "wild ape" no campo de pesquisa ---
    console.log('Etapa 3: Procurando pelo campo de pesquisa...');
    const searchInput = document.querySelector('input[placeholder="Pesquisar"]');

    if (!searchInput) {
      console.error('ERRO: Campo de pesquisa com placeholder "Pesquisar" não foi encontrado.');
      return;
    }
    
    searchInput.value = 'wild ape';
    // Dispara eventos para que o site reconheça a digitação
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('SUCESSO: Digitado "wild ape" no campo de pesquisa.');
    await sleep(2000); // Espera 2 segundos para os resultados da pesquisa aparecerem

    // --- ETAPA 4: Clicar na imagem do jogo "Wild Ape" ---
    console.log('Etapa 4: Procurando pelo jogo "Wild Ape" nos resultados...');
    const allGameNames = Array.from(document.querySelectorAll('h4'));
    const gameNameElement = allGameNames.find(h4 => h4.innerText && h4.innerText.trim() === 'Wild Ape');
    
    if (!gameNameElement) {
      console.error('ERRO: Jogo "Wild Ape" não encontrado nos resultados da pesquisa.');
      return;
    }

    // O elemento clicável é o container da imagem, não apenas o texto do nome
    const gameContainer = gameNameElement.closest('div[class*="_poster-box_"]');
    
    if (!gameContainer) {
        console.error('ERRO: Container clicável do jogo "Wild Ape" não foi encontrado.');
        return;
    }

    gameContainer.click();
    console.log('SUCESSO FINAL: Jogo "Wild Ape" foi clicado!');

  } catch (error) {
    console.error('Ocorreu um erro inesperado durante a automação:', error);
  }
}

// Inicia a automação
findAndClickGame();