// moverJanelas.js
// Sistema baseado em node-window-manager para posicionar as janelas dos navegadores.

const { windowManager } = require('node-window-manager');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildTitleRegex(targetId) {
  return new RegExp(`Navegador_ID_${targetId}(?![0-9])`, 'i');
}

function calculateBounds(position, config) {
  const width = Math.round(config.LARGURA_LOGICA * config.FATOR_ESCALA);
  const height = Math.round(config.ALTURA_LOGICA * config.FATOR_ESCALA);

  return {
    x: Math.round(position.x),
    y: Math.round(position.y),
    width,
    height
  };
}

async function waitForWindow(targetId, options = {}) {
  const {
    maxAttempts = 40,
    interval = 400,
    initialDelay = 0
  } = options;

  if (initialDelay > 0) {
    await sleep(initialDelay);
  }

  const titleRegex = buildTitleRegex(targetId);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    console.log(`Tentativa ${attempt}/${maxAttempts}: procurando janela ID ${targetId}...`);

    const windows = windowManager.getWindows();
    const matchedWindow = windows.find((win) => {
      try {
        const title = win.getTitle() || '';
        return titleRegex.test(title);
      } catch (error) {
        console.warn(`Falha ao ler titulo de janela: ${error.message}`);
        return false;
      }
    });

    if (matchedWindow) {
      const title = matchedWindow.getTitle();
      console.log(`Janela ID ${targetId} encontrada: "${title}"`);
      return matchedWindow;
    }

    if (attempt < maxAttempts) {
      await sleep(interval);
    }
  }

  console.log(`Timeout: janela ID ${targetId} nao foi encontrada apos ${maxAttempts} tentativas.`);
  return null;
}

async function moverJanelas(posicoesParaLancar, config) {
  const {
    DELAY_PARA_REGISTRO_JANELAS: delayParaRegistro = 0
  } = config;

  console.log(`
Iniciando movimentacao para ${posicoesParaLancar.length} janela(s)...`);

  let janelasMovidas = 0;

  const moverJanela = async (posicao) => {
    const windowHandle = await waitForWindow(posicao.id, {
      initialDelay: delayParaRegistro
    });

    if (!windowHandle) {
      console.warn(`AVISO: janela ID ${posicao.id} nao encontrada.`);
      return 0;
    }

    try {
      const expectedRegex = buildTitleRegex(posicao.id);
      const currentTitle = windowHandle.getTitle() || '';

      if (!expectedRegex.test(currentTitle)) {
        console.warn(`AVISO: ID ${posicao.id} nao confere para janela "${currentTitle}".`);
        return 0;
      }

      const bounds = calculateBounds(posicao, config);

      if (typeof windowHandle.restore === "function") {
        try {
          windowHandle.restore();
        } catch (restoreError) {
          console.warn(`Falha ao restaurar janela ID ${posicao.id}: ${restoreError.message}`);
        }
      }

      windowHandle.setBounds(bounds);
      windowHandle.bringToTop();

      console.log(`Janela ID ${posicao.id} ("${currentTitle}") reposicionada para x:${bounds.x}, y:${bounds.y}, largura:${bounds.width}, altura:${bounds.height}.`);
      janelasMovidas += 1;
      return 1;
    } catch (error) {
      console.error(`Erro ao mover janela ID ${posicao.id}:`, error.message);
      return 0;
    }
  };

  await Promise.all(posicoesParaLancar.map(moverJanela));

  return janelasMovidas;
}

module.exports = { moverJanelas };
