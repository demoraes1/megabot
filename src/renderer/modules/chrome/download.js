function initializeChromeDownloadModal() {
  const closeBtn = document.getElementById('close-download-modal-btn');
  const cancelBtn = document.getElementById('cancel-download-btn');

  closeBtn?.addEventListener('click', () => {
    hideChromeDownloadModal();
  });

  cancelBtn?.addEventListener('click', () => {
    console.log('Download cancelado pelo usuario');
  });
}

function showChromeDownloadModal(options = {}) {
  const modal = document.getElementById('chrome-download-modal');
  const title = document.getElementById('download-title');
  const message = document.getElementById('download-message');
  const versionInfo = document.getElementById('version-info');
  const currentVersion = document.getElementById('current-version');
  const newVersion = document.getElementById('new-version');
  const cancelBtn = document.getElementById('cancel-download-btn');
  const closeBtn = document.getElementById('close-download-modal-btn');

  if (!modal) {
    return;
  }

  title && (title.textContent = options.title || 'Baixando Chrome');
  message &&
    (message.textContent = options.message || 'Preparando download...');

  if (options.currentVersion || options.newVersion) {
    versionInfo?.classList.remove('hidden');
    currentVersion &&
      (currentVersion.textContent = options.currentVersion || '-');
    newVersion && (newVersion.textContent = options.newVersion || '-');
  }

  if (options.showCancel && cancelBtn) {
    cancelBtn.classList.remove('hidden');
  }

  if (options.showClose && closeBtn) {
    closeBtn.classList.remove('hidden');
  }

  updateDownloadProgress(0);
  modal.classList.remove('hidden');
}

function hideChromeDownloadModal() {
  const modal = document.getElementById('chrome-download-modal');
  if (!modal) {
    return;
  }

  modal.classList.add('hidden');
  document.getElementById('version-info')?.classList.add('hidden');
  document.getElementById('cancel-download-btn')?.classList.add('hidden');
  document.getElementById('close-download-modal-btn')?.classList.add('hidden');
}

function updateDownloadProgress(percentage, speed = '') {
  const progressBar = document.getElementById('download-progress-bar');
  const percentageText = document.getElementById('download-percentage');
  const speedText = document.getElementById('download-speed');

  progressBar && (progressBar.style.width = `${percentage}%`);
  percentageText && (percentageText.textContent = `${Math.round(percentage)}%`);
  speedText && (speedText.textContent = speed);
}

function updateDownloadMessage(message) {
  const messageElement = document.getElementById('download-message');
  if (messageElement) {
    messageElement.textContent = message;
  }
}

function showDownloadComplete(success = true) {
  const title = document.getElementById('download-title');
  const message = document.getElementById('download-message');
  const cancelBtn = document.getElementById('cancel-download-btn');
  const closeBtn = document.getElementById('close-download-modal-btn');

  if (success) {
    title && (title.textContent = 'Download Concluido!');
    message && (message.textContent = 'Chrome foi instalado com sucesso.');
    updateDownloadProgress(100);
  } else {
    title && (title.textContent = 'Erro no Download');
    message && (message.textContent = 'Ocorreu um erro durante o download.');
  }

  cancelBtn?.classList.add('hidden');
  closeBtn?.classList.remove('hidden');
}

function initializeChromeDownloadSystem() {
  if (!window?.electronAPI) {
    return;
  }

  window.electronAPI.onShowChromeDownloadModal((data) => {
    const title = data.isUpdate ? 'Atualizando Chrome' : 'Baixando Chrome';
    const message = data.isUpdate
      ? `Atualizando do Chrome ${data.currentVersion} para ${data.latestVersion}`
      : `Baixando Chrome ${data.latestVersion}`;

    chromeDownload.showChromeDownloadModal({ title, message });
  });

  window.electronAPI.onChromeDownloadProgress((progress) => {
    chromeDownload.updateDownloadProgress(
      progress.percent || 0,
      progress.speed || '0 KB/s',
    );
    if (progress.message) {
      chromeDownload.updateDownloadMessage(progress.message);
    }
  });

  window.electronAPI.onChromeDownloadComplete(() => {
    chromeDownload.showDownloadComplete(true);
    setTimeout(() => {
      chromeDownload.hideChromeDownloadModal();
    }, 2000);
  });

  window.electronAPI.onChromeDownloadError((error) => {
    chromeDownload.updateDownloadMessage(`Erro: ${error}`);
    chromeDownload.showDownloadComplete(false);
    setTimeout(() => {
      chromeDownload.hideChromeDownloadModal();
    }, 3000);
  });
}

const chromeDownload = {
  showChromeDownloadModal,
  hideChromeDownloadModal,
  updateDownloadProgress,
  updateDownloadMessage,
  showDownloadComplete,
};

if (typeof window !== 'undefined') {
  window.chromeDownload = chromeDownload;
}

export {
  chromeDownload,
  initializeChromeDownloadModal,
  initializeChromeDownloadSystem,
  showChromeDownloadModal,
  hideChromeDownloadModal,
  updateDownloadProgress,
  updateDownloadMessage,
  showDownloadComplete,
};
