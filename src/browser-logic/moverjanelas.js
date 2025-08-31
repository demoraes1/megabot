// moverJanelas.js

// Este módulo é responsável por encontrar e mover as janelas dos navegadores.

const { getWindows, Point, Size } = require('@nut-tree-fork/nut-js');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Encontra e posiciona as janelas dos navegadores com base nas posições fornecidas.
 * @param {Array<object>} posicoesParaLancar - Array de objetos, cada um com id, x, e y.
 * @param {object} config - Objeto de configuração.
 * @param {number} config.LARGURA_LOGICA - Largura lógica da janela.
 * @param {number} config.ALTURA_LOGICA - Altura lógica da janela.
 * @param {number} config.FATOR_ESCALA - Fator de escala a ser aplicado.
 * @param {number} config.DELAY_PARA_REGISTRO_JANELAS - Tempo de espera em ms.
 * @returns {Promise<number>} - O número de janelas movidas com sucesso.
 */
// Função para aguardar até que todas as janelas estejam prontas
async function aguardarTodasJanelas(posicoesParaLancar, maxTentativas = 15, intervalo = 1000) {
  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    console.log(`Tentativa ${tentativa}/${maxTentativas}: Verificando se todas as janelas estão prontas...`);
    
    const openWindows = await getWindows();
    const janelasEncontradas = [];
    
    for (const posicao of posicoesParaLancar) {
      const targetTitle = `Navegador_ID_${posicao.id}`;
      let encontrada = false;
      
      for (const win of openWindows) {
        const title = await win.getTitle();
        if (title.includes(targetTitle)) {
          encontrada = true;
          break;
        }
      }
      
      janelasEncontradas.push({ id: posicao.id, encontrada });
    }
    
    const todasEncontradas = janelasEncontradas.every(j => j.encontrada);
    const encontradas = janelasEncontradas.filter(j => j.encontrada).length;
    
    console.log(`Janelas encontradas: ${encontradas}/${posicoesParaLancar.length}`);
    
    if (todasEncontradas) {
      console.log('Todas as janelas estão prontas!');
      return true;
    }
    
    if (tentativa < maxTentativas) {
      console.log(`Aguardando ${intervalo}ms antes da próxima verificação...`);
      await sleep(intervalo);
    }
  }
  
  console.log('Timeout: Nem todas as janelas estavam prontas, prosseguindo mesmo assim...');
  return false;
}

async function moverJanelas(posicoesParaLancar, config) {
  const {
    LARGURA_LOGICA,
    ALTURA_LOGICA,
    FATOR_ESCALA,
    DELAY_PARA_REGISTRO_JANELAS
  } = config;

  console.log(`\nAguardando ${DELAY_PARA_REGISTRO_JANELAS}ms inicial para as janelas começarem a carregar...`);
  await sleep(DELAY_PARA_REGISTRO_JANELAS);
  
  // Aguardar até que todas as janelas estejam prontas
  await aguardarTodasJanelas(posicoesParaLancar);
  
  console.log('Movendo janelas para as posições corretas em paralelo...');

  const LARGURA_FISICA = Math.round(LARGURA_LOGICA * FATOR_ESCALA);
  const ALTURA_FISICA = Math.round(ALTURA_LOGICA * FATOR_ESCALA);
  let janelasMovidas = 0;

  const openWindows = await getWindows();

  const movePromises = posicoesParaLancar.map(async (posicao) => {
    const targetTitle = `Navegador_ID_${posicao.id}`;
    let windowToMove = null;

    for (const win of openWindows) {
      const title = await win.getTitle();
      if (title.includes(targetTitle)) {
        windowToMove = win;
        break;
      }
    }

    if (windowToMove) {
      try {
        const targetPoint = new Point(posicao.x, posicao.y);
        const targetSize = new Size(LARGURA_FISICA, ALTURA_FISICA);
        
        await windowToMove.move(targetPoint);
        await windowToMove.resize(targetSize);

        console.log(`Janela "${targetTitle}" reposicionada para x:${posicao.x}, y:${posicao.y}.`);
        janelasMovidas++;
      } catch (e) {
        console.error(`Erro ao mover a janela "${targetTitle}":`, e.message);
      }
    } else {
      console.warn(`AVISO: Não foi possível encontrar a janela com o título "${targetTitle}".`);
    }
  });

  await Promise.all(movePromises);
  return janelasMovidas;
}

// Exporta a função para que possa ser usada em outros arquivos
module.exports = { moverJanelas };