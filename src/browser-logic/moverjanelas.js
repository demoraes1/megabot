// moverJanelas.js
// Sistema baseado em node-window-manager para posicionar as janelas dos navegadores.

const { windowManager } = require('node-window-manager');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_POLL_INTERVAL_MS = 250;
const STATUS_LOG_INTERVAL_MS = 2000;
const MIN_POLL_INTERVAL_MS = 100;

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

function repositionWindow(windowHandle, posicao, config) {
  try {
    const expectedRegex = buildTitleRegex(posicao.id);
    const currentTitle = windowHandle.getTitle() || '';

    if (!expectedRegex.test(currentTitle)) {
      console.warn(`AVISO: ID ${posicao.id} nao confere para janela "${currentTitle}".`);
      return false;
    }

    const bounds = calculateBounds(posicao, config);

    if (typeof windowHandle.restore === 'function') {
      try {
        windowHandle.restore();
      } catch (restoreError) {
        console.warn(`Falha ao restaurar janela ID ${posicao.id}: ${restoreError.message}`);
      }
    }

    windowHandle.setBounds(bounds);
    windowHandle.bringToTop();

    console.log(`Janela ID ${posicao.id} ("${currentTitle}") reposicionada para x:${bounds.x}, y:${bounds.y}, largura:${bounds.width}, altura:${bounds.height}.`);
    return true;
  } catch (error) {
    console.error(`Erro ao mover janela ID ${posicao.id}:`, error.message);
    return false;
  }
}

async function moverJanelas(posicoesParaLancar, config) {
  const {
    DELAY_PARA_REGISTRO_JANELAS: delayParaRegistro = 0,
    TIMEOUT_MOVIMENTACAO_MS: timeoutOverride,
    INTERVALO_VERIFICACAO_MS: pollOverride
  } = config || {};

  if (!Array.isArray(posicoesParaLancar) || posicoesParaLancar.length === 0) {
    return 0;
  }

  console.log(`
Iniciando movimentacao para ${posicoesParaLancar.length} janela(s)...`);

  const timeoutMs = Number.isFinite(timeoutOverride) ? Math.max(0, timeoutOverride) : DEFAULT_TIMEOUT_MS;
  const pollIntervalMs = Number.isFinite(pollOverride) ? Math.max(MIN_POLL_INTERVAL_MS, pollOverride) : DEFAULT_POLL_INTERVAL_MS;

  const pending = new Map();
  posicoesParaLancar.forEach((posicao) => {
    if (posicao && posicao.id !== undefined && posicao.id !== null) {
      pending.set(String(posicao.id), {
        position: posicao,
        regex: buildTitleRegex(posicao.id)
      });
    }
  });

  if (pending.size === 0) {
    console.warn('Nenhuma posicao valida recebida para movimentacao de janelas.');
    return 0;
  }

  let janelasMovidas = 0;

  if (delayParaRegistro > 0) {
    await sleep(delayParaRegistro);
  }

  const start = Date.now();
  let lastStatusLog = start;

  while (pending.size > 0) {
    const windows = windowManager.getWindows();

    for (const win of windows) {
      let title = '';
      try {
        title = win.getTitle() || '';
      } catch (error) {
        continue;
      }

      for (const [id, data] of pending) {
        if (!data.regex.test(title)) {
          continue;
        }

        const moved = repositionWindow(win, data.position, config);
        if (moved) {
          pending.delete(id);
          janelasMovidas += 1;
        }
        break;
      }
    }

    if (pending.size === 0) {
      break;
    }

    const now = Date.now();

    if (timeoutMs > 0 && (now - start) >= timeoutMs) {
      pending.forEach((data, id) => {
        console.warn(`Timeout: janela ID ${id} nao foi encontrada em ${timeoutMs}ms.`);
      });
      break;
    }

    if ((now - lastStatusLog) >= STATUS_LOG_INTERVAL_MS) {
      console.log(`Aguardando reposicionamento de ${pending.size} janela(s)...`);
      lastStatusLog = now;
    }

    await sleep(pollIntervalMs);
  }

  return janelasMovidas;
}

module.exports = { moverJanelas };
