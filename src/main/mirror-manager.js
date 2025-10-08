const { EventEmitter } = require('events');
const WebSocket = require('ws');
const MirrorBroker = require('./mirror/ws-broker');
const createControllerScript = require('./mirror/controller-script');
const MirrorFollowerClient = require('./mirror/follower-client');

class MirrorManager extends EventEmitter {
  constructor() {
    super();
    this.logger = console;
    this.getActiveBrowserIds = null;
    this.resolveBrowserEntry = null;
    this.enabled = false;
    this.syncStates = null;

    this.controller = {
      navigatorId: null,
      page: null,
      handlers: null
    };

    this.followers = new Map(); // navigatorId -> { client, page, handlers }

    this.room = 'megabot-mirror';
    this.broker = new MirrorBroker({ path: '/mirror' });
    this.brokerInfo = null;

    this.leaderSocket = null;
    this.leaderNavigatorId = null;
    this.leaderReady = false;
    this.leaderQueue = [];
    this.assignmentPromise = Promise.resolve();
  }

  configure(options = {}) {
    this.logger = options.logger || console;
    this.getActiveBrowserIds = typeof options.getActiveBrowserIds === 'function' ? options.getActiveBrowserIds : null;
    this.resolveBrowserEntry = typeof options.resolveBrowserEntry === 'function' ? options.resolveBrowserEntry : null;
  }

  async enable(syncStates = null) {
    if (this.enabled) {
      this.syncStates = syncStates || null;
      await this.rebuildAssignments('refresh');
      this.emitStatus();
      return Object.assign({ success: true, enabled: true }, this.pickStatusFields());
    }

    this.syncStates = syncStates || null;

    try {
      await this.startBroker();
    } catch (error) {
      this.logger.error('[Mirror] Falha ao iniciar broker WS: %s', error.message);
      return { success: false, enabled: false, reason: 'broker-error', message: error.message };
    }

    const result = await this.rebuildAssignments('enable');
    if (!result.success) {
      await this.disableInternal(false);
      return Object.assign({ enabled: false }, result);
    }

    this.enabled = true;
    this.emitStatus();
    return Object.assign({ success: true, enabled: true }, this.pickStatusFields());
  }

  async disable() {
    const result = await this.disableInternal(true);
    return Object.assign({ success: true }, result);
  }

  async disableInternal(emitStatus = true) {
    await this.teardownController();
    await this.teardownFollowers();
    await this.stopBroker();
    this.enabled = false;
    this.syncStates = null;

    if (emitStatus) {
      this.emitStatus();
    }

    return { enabled: false, controllerId: null, controlledIds: [] };
  }

  getStatus() {
    return {
      enabled: this.enabled,
      controllerId: this.controller.navigatorId,
      controlledIds: Array.from(this.followers.keys()),
      broker: this.brokerInfo
    };
  }

  pickStatusFields() {
    return {
      controllerId: this.controller.navigatorId,
      controlledIds: Array.from(this.followers.keys())
    };
  }

  emitStatus() {
    try {
      this.emit('status-changed', this.getStatus());
    } catch (error) {
      this.logger.warn('[Mirror] Falha ao emitir status: %s', error.message);
    }
  }

  handleActiveBrowsersChanged(reason = 'active-change') {
    if (!this.enabled) {
      return;
    }

    this.assignmentPromise = this.assignmentPromise.then(() => this.rebuildAssignments(reason)).catch((error) => {
      this.logger.warn('[Mirror] Falha ao atualizar atribuicoes: %s', error.message);
    });
  }

  async startBroker() {
    if (this.brokerInfo) {
      return this.brokerInfo;
    }

    await this.broker.start();
    this.brokerInfo = this.broker.getConnectionInfo();
    return this.brokerInfo;
  }

  async stopBroker() {
    this.brokerInfo = null;
    await this.teardownLeaderSocket();
    await this.broker.stop();
  }

  async ensureLeaderSocket(navigatorId) {
    if (!this.brokerInfo || !this.brokerInfo.url) {
      await this.startBroker().catch((error) => {
        throw new Error(`Broker WS indisponível: ${error.message}`);
      });
    }

    if (!this.brokerInfo || !this.brokerInfo.url) {
      throw new Error('Broker WS indisponível');
    }

    if (this.leaderSocket && this.leaderNavigatorId === navigatorId) {
      if (this.leaderSocket.readyState === WebSocket.OPEN) {
        this.leaderReady = true;
        return;
      }
      if (this.leaderSocket.readyState === WebSocket.CONNECTING) {
        return;
      }
    } else {
      await this.teardownLeaderSocket();
    }

    const url = new URL(this.brokerInfo.url);
    url.searchParams.set('role', 'leader');
    url.searchParams.set('room', this.room);
    url.searchParams.set('navigatorId', String(navigatorId || ''));

    const socket = new WebSocket(url.toString());
    this.leaderSocket = socket;
    this.leaderNavigatorId = navigatorId;
    this.leaderReady = false;
    this.leaderQueue = [];

    socket.on('open', () => {
      this.leaderReady = true;
      for (const payload of this.leaderQueue.splice(0)) {
        try {
          socket.send(payload);
        } catch (error) {
          this.logger.warn('[Mirror] Falha ao enviar payload pendente: %s', error.message);
        }
      }
    });

    socket.on('close', () => {
      this.leaderReady = false;
      this.leaderNavigatorId = null;
      if (this.enabled) {
        this.logger.debug('[Mirror] Socket do líder fechado, reabrindo...');
        this.ensureLeaderSocket(this.controller.navigatorId).catch((error) => {
          this.logger.warn('[Mirror] Reabertura do socket do líder falhou: %s', error.message);
        });
      }
    });

    socket.on('error', (error) => {
      this.logger.warn('[Mirror] Erro no socket do líder: %s', error.message);
    });
  }

  async teardownLeaderSocket() {
    if (!this.leaderSocket) {
      return;
    }
    try {
      this.leaderSocket.terminate();
    } catch (error) {
      // ignore
    }
    this.leaderSocket = null;
    this.leaderNavigatorId = null;
    this.leaderReady = false;
    this.leaderQueue = [];
  }

  async rebuildAssignments(reason) {
    if (typeof this.getActiveBrowserIds !== 'function' || typeof this.resolveBrowserEntry !== 'function') {
      return {
        success: false,
        reason: 'not-configured',
        message: 'MirrorManager não foi configurado.'
      };
    }

    const browserIds = this.getActiveBrowserIds(this.syncStates) || [];
    const entries = [];

    for (const navigatorId of browserIds) {
      const resolved = this.resolveBrowserEntry(navigatorId);
      if (!resolved || !resolved.page || typeof resolved.page.isClosed !== 'function') {
        continue;
      }
      if (resolved.page.isClosed()) {
        continue;
      }
      entries.push({ navigatorId, page: resolved.page });
    }

    if (entries.length < 1) {
      return {
        success: false,
        reason: 'no-pages',
        message: 'Não há navegadores ativos para o modo espelho.'
      };
    }

    const [controllerEntry, ...followerEntries] = entries;

    try {
      await this.setController(controllerEntry.navigatorId, controllerEntry.page);
    } catch (error) {
      return {
        success: false,
        reason: 'controller-error',
        message: `Falha ao configurar controlador: ${error.message}`
      };
    }

    const existingFollowers = new Set(this.followers.keys());
    const nextFollowers = new Set();

    for (const follower of followerEntries) {
      nextFollowers.add(follower.navigatorId);
      if (!this.followers.has(follower.navigatorId)) {
        try {
          await this.addFollower(follower.navigatorId, follower.page);
        } catch (error) {
          this.logger.warn('[Mirror] Falha ao adicionar navegador espelhado %s: %s', follower.navigatorId, error.message);
        }
      } else {
        this.refreshFollower(follower.navigatorId, follower.page);
      }
    }

    for (const navigatorId of existingFollowers) {
      if (!nextFollowers.has(navigatorId)) {
        await this.removeFollower(navigatorId);
      }
    }

    return {
      success: true,
      controllerId: controllerEntry.navigatorId,
      controlledIds: Array.from(this.followers.keys())
    };
  }

  async setController(navigatorId, page) {
    if (!page || typeof page.isClosed !== 'function' || page.isClosed()) {
      throw new Error('Página inválida para controlador.');
    }

    if (this.controller.page === page) {
      await this.ensureLeaderSocket(navigatorId);
      return;
    }

    await this.teardownController();
    await this.ensureLeaderSocket(navigatorId);

    const script = createControllerScript({
      room: this.room,
      navigatorId
    });

    const handleLeaderPayload = (payload) => {
      if (!payload || typeof payload !== 'object') {
        return;
      }

      const enriched = Object.assign({}, payload, {
        navigatorId,
        room: payload.room || this.room
      });

      const serialized = JSON.stringify(enriched);
      if (this.leaderSocket && this.leaderReady) {
        try {
          this.leaderSocket.send(serialized);
        } catch (error) {
          this.logger.warn('[Mirror] Falha ao enviar payload do controlador: %s', error.message);
        }
      } else {
        this.leaderQueue.push(serialized);
      }
    };

    await page.exposeFunction('mirrorEmit', handleLeaderPayload);

    const onDomContentLoaded = async () => {
      try {
        await page.evaluate(script);
      } catch (error) {
        this.logger.debug('[Mirror] Reinjeção (domcontentloaded) falhou: %s', error.message);
      }
    };

    const onFrameNavigated = async (frame) => {
      if (!frame || frame !== page.mainFrame()) {
        return;
      }
      try {
        await page.evaluate(script);
      } catch (error) {
        this.logger.debug('[Mirror] Reinjeção (framenavigated) falhou: %s', error.message);
      }
    };

    const onClose = () => {
      if (!this.enabled) {
        return;
      }
      this.handleActiveBrowsersChanged('controller-closed');
    };

    this.controller = {
      navigatorId,
      page,
      handlers: {
        domContentLoaded: onDomContentLoaded,
        frameNavigated: onFrameNavigated,
        close: onClose
      }
    };

    page.on('domcontentloaded', onDomContentLoaded);
    page.on('framenavigated', onFrameNavigated);
    page.on('close', onClose);

    try {
      await page.evaluateOnNewDocument(script);
    } catch (error) {
      const message = error && error.message ? error.message : '';
      if (!String(message).includes('Execution context was destroyed')) {
        this.logger.debug('[Mirror] evaluateOnNewDocument (controller) falhou: %s', message);
      }
    }

    try {
      await page.evaluate(script);
    } catch (error) {
      this.logger.debug('[Mirror] Injeção inicial no controlador falhou: %s', error.message);
    }
  }

  async teardownController() {
    const { page, handlers } = this.controller;
    if (page && handlers) {
      try {
        page.removeListener('domcontentloaded', handlers.domContentLoaded);
        page.removeListener('framenavigated', handlers.frameNavigated);
        page.removeListener('close', handlers.close);
      } catch (error) {
        this.logger.debug('[Mirror] Falha ao remover listeners do controlador: %s', error.message);
      }
    }
    this.controller = {
      navigatorId: null,
      page: null,
      handlers: null
    };
  }

  async addFollower(navigatorId, page) {
    if (!page || typeof page.isClosed !== 'function' || page.isClosed()) {
      throw new Error('Página inválida para seguidor.');
    }

    if (!this.brokerInfo || !this.brokerInfo.url) {
      await this.startBroker();
    }

    if (!this.brokerInfo || !this.brokerInfo.url) {
      throw new Error('Broker WS indisponível');
    }

    const client = new MirrorFollowerClient({
      page,
      navigatorId,
      room: this.room,
      logger: this.logger
    });

    await client.connect(this.brokerInfo);

    const onClose = () => {
      if (!this.enabled) {
        return;
      }
      this.handleActiveBrowsersChanged('follower-closed');
    };

    const onFrameNavigated = () => {
      client.viewportCache = null;
    };

    page.on('close', onClose);
    page.on('framenavigated', onFrameNavigated);

    this.followers.set(navigatorId, {
      page,
      client,
      handlers: { close: onClose, frameNavigated: onFrameNavigated }
    });
  }

  refreshFollower(navigatorId, page) {
    const entry = this.followers.get(navigatorId);
    if (!entry) {
      return;
    }
    if (entry.page !== page) {
      if (entry.handlers) {
        try {
          entry.page.removeListener('close', entry.handlers.close);
          entry.page.removeListener('framenavigated', entry.handlers.frameNavigated);
        } catch (error) {
          this.logger.debug('[Mirror] Falha ao atualizar listener do seguidor: %s', error.message);
        }
      }
      const onClose = () => {
        if (!this.enabled) {
          return;
        }
        this.handleActiveBrowsersChanged('follower-closed');
      };
      const onFrameNavigated = () => {
        entry.client.viewportCache = null;
      };
      page.on('close', onClose);
      page.on('framenavigated', onFrameNavigated);
      entry.page = page;
      entry.handlers = { close: onClose, frameNavigated: onFrameNavigated };
    }
  }

  async removeFollower(navigatorId) {
    const entry = this.followers.get(navigatorId);
    if (!entry) {
      return;
    }
    this.followers.delete(navigatorId);
    if (entry.handlers) {
      try {
        entry.page.removeListener('close', entry.handlers.close);
        entry.page.removeListener('framenavigated', entry.handlers.frameNavigated);
      } catch (error) {
        this.logger.debug('[Mirror] Falha ao remover listeners do seguidor: %s', error.message);
      }
    }
    if (entry.client) {
      await entry.client.disconnect().catch(() => {});
    }
  }

  async teardownFollowers() {
    const removals = [];
    for (const navigatorId of this.followers.keys()) {
      removals.push(this.removeFollower(navigatorId));
    }
    await Promise.all(removals);
  }
}

module.exports = new MirrorManager();
