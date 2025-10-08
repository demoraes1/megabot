const WebSocket = require('ws');

const BUTTON_MAP = {
  0: 'left',
  1: 'middle',
  2: 'right'
};

class MirrorFollowerClient {
  constructor(options) {
    this.page = options.page;
    this.navigatorId = options.navigatorId;
    this.room = options.room || 'default';
    this.logger = options.logger || console;
    this.ws = null;
    this.closed = false;
    this.touchActive = false;
    this.mouseButtons = 0;
    this.cdpSession = null;
    this.viewportCache = null;
    this.viewportCacheTs = 0;
  }

  get loggerPrefix() {
    return `[MirrorFollower ${this.navigatorId}]`;
  }

  async connect(brokerInfo) {
    if (!brokerInfo || !brokerInfo.url) {
      throw new Error('MirrorFollowerClient: broker info inválido');
    }

    const url = new URL(brokerInfo.url);
    url.searchParams.set('role', 'follower');
    url.searchParams.set('room', this.room);
    url.searchParams.set('navigatorId', String(this.navigatorId || ''));

    this.ws = new WebSocket(url.toString());

    this.ws.on('open', () => {
      this.logger.debug?.(`${this.loggerPrefix} conectado ao broker ${url.toString()}`);
    });

    this.ws.on('close', () => {
      this.logger.debug?.(`${this.loggerPrefix} desconectado do broker`);
      this.touchActive = false;
      this.mouseButtons = 0;
      this.ws = null;
    });

    this.ws.on('error', (error) => {
      this.logger.warn?.(`${this.loggerPrefix} erro de WS: ${error.message}`);
    });

    this.ws.on('message', async (data, isBinary) => {
      if (isBinary) {
        return;
      }

      let payload;
      try {
        payload = JSON.parse(data.toString());
      } catch (error) {
        this.logger.warn?.(`${this.loggerPrefix} payload inválido: ${error.message}`);
        return;
      }

      await this.handleMessage(payload).catch((error) => {
        this.logger.warn?.(`${this.loggerPrefix} falha ao reproduzir evento: ${error.message}`);
      });
    });
  }

  async disconnect() {
    this.closed = true;
    if (this.ws) {
      try {
        this.ws.terminate();
      } catch (error) {
        // ignore
      }
      this.ws = null;
    }
    if (this.cdpSession) {
      try {
        await this.cdpSession.detach();
      } catch (error) {
        // ignore
      }
      this.cdpSession = null;
    }
  }

  async ensureSession() {
    if (!this.cdpSession) {
      const target = this.page.target();
      this.cdpSession = await target.createCDPSession();
    }
    return this.cdpSession;
  }

  async getViewport() {
    const now = Date.now();
    if (this.viewportCache && now - this.viewportCacheTs < 250) {
      return this.viewportCache;
    }

    try {
      const result = await this.page.evaluate(() => {
        const vv = window.visualViewport;
        if (vv) {
          return { w: vv.width, h: vv.height };
        }
        return { w: window.innerWidth || 1, h: window.innerHeight || 1 };
      });
      if (result && typeof result.w === 'number' && typeof result.h === 'number') {
        this.viewportCache = result;
        this.viewportCacheTs = now;
        return result;
      }
    } catch (error) {
      this.logger.debug?.(`${this.loggerPrefix} falha ao obter viewport: ${error.message}`);
    }

    return { w: 1280, h: 720 };
  }

  async toCoordinates(nx, ny) {
    const viewport = await this.getViewport();
    return {
      x: nx * viewport.w,
      y: ny * viewport.h
    };
  }

  async handleMessage(message) {
    if (!message || message.room !== this.room || message.role !== 'leader') {
      return;
    }

    if (message.navigatorId && String(message.navigatorId) === String(this.navigatorId)) {
      return;
    }

    const data = message.data || {};
    switch (message.type) {
      case 'pointer':
        await this.handlePointer(data);
        break;
      case 'wheel':
        await this.handleWheel(data);
        break;
      case 'keyDown':
      case 'keyUp':
        await this.handleKey(message.type, data);
        break;
      case 'insertText':
        await this.handleInsertText(data);
        break;
      case 'scroll':
        await this.handleScroll(data);
        break;
      default:
        break;
    }
  }

  mapButton(button) {
    if (BUTTON_MAP.hasOwnProperty(button)) {
      return BUTTON_MAP[button];
    }
    return 'left';
  }

  modifiersMask(data) {
    let mask = 0;
    if (data.altKey) mask |= 1;
    if (data.ctrlKey) mask |= 2;
    if (data.metaKey) mask |= 4;
    if (data.shiftKey) mask |= 8;
    return mask;
  }

  async handlePointer(data) {
    if (!data || typeof data.nx !== 'number' || typeof data.ny !== 'number') {
      return;
    }

    const { x, y } = await this.toCoordinates(data.nx, data.ny);
    const type = (data.pointerType || 'mouse').toLowerCase();
    const session = await this.ensureSession();

    if (type === 'touch') {
      await this.replayTouch(session, data, x, y);
    } else {
      await this.replayMouse(session, data, x, y);
    }
  }

  async replayMouse(session, data, x, y) {
    const phase = data.phase || 'move';
    const eventType = phase === 'down' ? 'mousePressed' : phase === 'up' ? 'mouseReleased' : 'mouseMoved';
    const button = this.mapButton(typeof data.button === 'number' ? data.button : 0);
    const buttons = typeof data.buttons === 'number' ? data.buttons : this.mouseButtons;
    const clickCount = typeof data.detail === 'number' && data.detail > 0 ? data.detail : 1;

    try {
      await session.send('Input.dispatchMouseEvent', {
        type: eventType,
        x,
        y,
        button,
        buttons,
        clickCount,
        modifiers: this.modifiersMask(data)
      });
    } catch (error) {
      const message = error && error.message ? error.message : '';
      if (message.includes('Target closed')) {
        return;
      }
      throw error;
    }

    if (phase === 'down') {
      this.mouseButtons |= 1;
    } else if (phase === 'up') {
      this.mouseButtons = 0;
    }
  }

  async replayTouch(session, data, x, y) {
    const phase = data.phase || 'move';
    const typeMap = {
      down: 'touchStart',
      move: 'touchMove',
      up: 'touchEnd',
      cancel: 'touchCancel'
    };
    const eventType = typeMap[phase] || 'touchMove';
    const force = typeof data.pressure === 'number' ? data.pressure : phase === 'up' ? 0 : 0.5;

    const touchPoints = eventType === 'touchEnd' || eventType === 'touchCancel'
      ? []
      : [{
          x,
          y,
          id: typeof data.pointerId === 'number' ? data.pointerId : 1,
          radiusX: typeof data.width === 'number' ? Math.max(1, data.width / 2) : 8,
          radiusY: typeof data.height === 'number' ? Math.max(1, data.height / 2) : 8,
          force
        }];

    try {
      await session.send('Input.dispatchTouchEvent', {
        type: eventType,
        touchPoints,
        modifiers: this.modifiersMask(data)
      });
    } catch (error) {
      const message = error && error.message ? error.message : '';
      if (message.includes('Target closed')) {
        return;
      }
      throw error;
    }

    this.touchActive = eventType !== 'touchEnd' && eventType !== 'touchCancel';
  }

  async handleWheel(data) {
    if (typeof data.nx !== 'number' || typeof data.ny !== 'number') {
      return;
    }
    const { x, y } = await this.toCoordinates(data.nx, data.ny);
    const session = await this.ensureSession();
    try {
      await session.send('Input.dispatchMouseEvent', {
        type: 'mouseWheel',
        x,
        y,
        deltaX: data.deltaX || 0,
        deltaY: data.deltaY || 0,
        modifiers: this.modifiersMask(data)
      });
    } catch (error) {
      const message = error && error.message ? error.message : '';
      if (message.includes('Target closed')) {
        return;
      }
      throw error;
    }
  }

  async handleKey(type, data) {
    if (!data || !data.key || !data.code) {
      return;
    }
    const session = await this.ensureSession();
    try {
      await session.send('Input.dispatchKeyEvent', {
        type: type === 'keyDown' ? 'keyDown' : 'keyUp',
        key: data.key,
        code: data.code,
        windowsVirtualKeyCode: typeof data.keyCode === 'number' ? data.keyCode : undefined,
        nativeVirtualKeyCode: typeof data.keyCode === 'number' ? data.keyCode : undefined,
        autoRepeat: !!data.repeat,
        modifiers: this.modifiersMask(data)
      });
    } catch (error) {
      const message = error && error.message ? error.message : '';
      if (message.includes('Target closed')) {
        return;
      }
      throw error;
    }
  }

  async handleInsertText(data) {
    if (!data || typeof data.value !== 'string') {
      return;
    }
    const session = await this.ensureSession();
    try {
      await session.send('Input.insertText', { text: data.value });
    } catch (error) {
      const message = error && error.message ? error.message : '';
      if (message.includes('Target closed')) {
        return;
      }
      throw error;
    }
  }

  async handleScroll(data) {
    if (!data || (typeof data.x !== 'number' && typeof data.y !== 'number')) {
      return;
    }
    try {
      await this.page.evaluate((x, y) => {
        window.scrollTo(x, y);
      }, data.x || 0, data.y || 0);
    } catch (error) {
      this.logger.debug?.(`${this.loggerPrefix} falha ao aplicar scroll: ${error.message}`);
    }
  }
}

module.exports = MirrorFollowerClient;
