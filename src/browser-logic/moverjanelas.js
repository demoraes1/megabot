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
// Função para aguardar passivamente uma janela específica estar pronta
async function aguardarJanelaEspecifica(targetId, maxTentativas = 30, intervalo = 500) {
  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    console.log(`Tentativa ${tentativa}/${maxTentativas}: Procurando janela ID ${targetId}...`);
    
    const openWindows = await getWindows();
    
    for (const win of openWindows) {
      const title = await win.getTitle();
      // Verificação exata do ID para evitar confusão entre IDs similares (1, 11, 12, 13)
      const regex = new RegExp(`Navegador_ID_${targetId}(?![0-9])`, 'i');
      if (regex.test(title)) {
        console.log(`Janela ID ${targetId} encontrada: "${title}"`);
        return win;
      }
    }
    
    if (tentativa < maxTentativas) {
      await sleep(intervalo);
    }
  }
  
  console.log(`Timeout: Janela ID ${targetId} não foi encontrada após ${maxTentativas} tentativas`);
  return null;
}

async function moverJanelas(posicoesParaLancar, config) {
  const {
    LARGURA_LOGICA,
    ALTURA_LOGICA,
    FATOR_ESCALA,
    DELAY_PARA_REGISTRO_JANELAS
  } = config;

  console.log(`\nIniciando processo de movimentação para ${posicoesParaLancar.length} janela(s)...`);
  
  const LARGURA_FISICA = Math.round(LARGURA_LOGICA * FATOR_ESCALA);
  const ALTURA_FISICA = Math.round(ALTURA_LOGICA * FATOR_ESCALA);
  let janelasMovidas = 0;

  // Processar cada janela individualmente com aguardo passivo
  const movePromises = posicoesParaLancar.map(async (posicao) => {
    console.log(`Aguardando passivamente janela ID ${posicao.id} estar pronta...`);
    
    // Aguardar passivamente a janela específica estar pronta
    const windowToMove = await aguardarJanelaEspecifica(posicao.id);

    if (windowToMove) {
      try {
        // Verificar novamente o ID antes de mover para garantia extra
        const title = await windowToMove.getTitle();
        const regex = new RegExp(`Navegador_ID_${posicao.id}(?![0-9])`, 'i');
        
        if (!regex.test(title)) {
          console.warn(`AVISO: ID não confere para janela "${title}". Esperado ID ${posicao.id}`);
          return 0;
        }
        
        const targetPoint = new Point(posicao.x, posicao.y);
        const targetSize = new Size(LARGURA_FISICA, ALTURA_FISICA);
        
        await windowToMove.move(targetPoint);
        await windowToMove.resize(targetSize);

        console.log(`Janela ID ${posicao.id} ("${title}") reposicionada para x:${posicao.x}, y:${posicao.y}.`);
        janelasMovidas++;
        return 1;
      } catch (e) {
        console.error(`Erro ao mover a janela ID ${posicao.id}:`, e.message);
        return 0;
      }
    } else {
      console.warn(`AVISO: Não foi possível encontrar a janela ID ${posicao.id}.`);
      return 0;
    }
  });

  await Promise.all(movePromises);
  return janelasMovidas;
}

// Exporta a função para que possa ser usada em outros arquivos
module.exports = { moverJanelas };