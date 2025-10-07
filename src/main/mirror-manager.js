const { EventEmitter } = require('events');

const MIRROR_ALLOWED_KEYS = new Set(['Enter', 'Tab', 'Escape']);
const MIRROR_BUTTON_MAP = {
  0: 'left',
  1: 'middle',
  2: 'right'
};

const mirrorControllerInjection = `
(() => {
  if (window.__megabotMirrorInjected) {
    if (typeof window.megabotMirrorSetEnabled === 'function') {
      window.megabotMirrorSetEnabled(true);
    }
    return;
  }

  window.__megabotMirrorInjected = true;
  window.__megabotMirrorEnabled = true;

  const getCssSelector = (element) => {
    if (!(element instanceof Element)) {
      return null;
    }

    const path = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let selector = element.nodeName.toLowerCase();

      if (element.id) {
        selector += '#' + element.id;
        path.unshift(selector);
        break;
      }

      let sibling = element;
      let nth = 1;
      while ((sibling = sibling.previousElementSibling)) {
        if (sibling.nodeName.toLowerCase() === selector) {
          nth++;
        }
      }

      if (nth !== 1) {
        selector += ':nth-of-type(' + nth + ')';
      }

      path.unshift(selector);
      element = element.parentElement;
    }

    return path.join(' > ');
  };

  const relay = (type, payload) => {
    if (!window.__megabotMirrorEnabled) {
      return;
    }

    if (typeof window.megabotMirrorRelay === 'function') {
      window.megabotMirrorRelay(Object.assign({ type }, payload));
    }
  };

  const pointerHandler = (event) => {
    if (!window.__megabotMirrorEnabled) {
      return;
    }

    if (!event || event.isTrusted === false) {
      return;
    }

    let pointerType = 'mouse';
    let clientX = 0;
    let clientY = 0;
    let button = 0;

    if (event.type.startsWith('pointer')) {
      pointerType = event.pointerType || 'mouse';
      clientX = typeof event.clientX === 'number' ? event.clientX : 0;
      clientY = typeof event.clientY === 'number' ? event.clientY : 0;
      button = typeof event.button === 'number' ? event.button : 0;
    } else if (event.type.startsWith('touch')) {
      pointerType = 'touch';
      const touch = event.touches && event.touches.length > 0
        ? event.touches[0]
        : (event.changedTouches && event.changedTouches.length > 0 ? event.changedTouches[0] : null);
      if (touch) {
        clientX = typeof touch.clientX === 'number' ? touch.clientX : 0;
        clientY = typeof touch.clientY === 'number' ? touch.clientY : 0;
      }
    } else {
      pointerType = 'mouse';
      clientX = typeof event.clientX === 'number' ? event.clientX : 0;
      clientY = typeof event.clientY === 'number' ? event.clientY : 0;
      button = typeof event.button === 'number' ? event.button : 0;
    }

    relay('pointer', {
      pointerType,
      button,
      x: clientX,
      y: clientY,
      detail: typeof event.detail === 'number' ? event.detail : 1
    });
  };

  if (window.PointerEvent) {
    window.addEventListener('pointerdown', pointerHandler, true);
  } else {
    window.addEventListener('mousedown', pointerHandler, true);
    window.addEventListener('touchstart', pointerHandler, true);
  }

  const captureInputState = (target) => {
    const tagName = target && target.tagName ? target.tagName.toLowerCase() : '';
    const fieldType = target && target.type ? String(target.type).toLowerCase() : '';

    const payload = {
      selector: getCssSelector(target),
      tagName,
      fieldType,
      value: target && target.value !== undefined ? target.value : '',
      checked: typeof target?.checked === 'boolean' ? target.checked : undefined,
      isContentEditable: !!(target && target.isContentEditable)
    };

    if (payload.isContentEditable) {
      payload.value = target.innerText;
    }

    if (typeof target?.selectionStart === 'number' && typeof target?.selectionEnd === 'number') {
      payload.selectionStart = target.selectionStart;
      payload.selectionEnd = target.selectionEnd;
    }

    return payload;
  };

  const inputHandler = (event) => {
    if (!window.__megabotMirrorEnabled) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const payload = captureInputState(target);
    payload.inputType = event.inputType || null;
    relay('input', payload);
  };

  document.addEventListener('input', inputHandler, true);
  document.addEventListener('change', inputHandler, true);

  window.addEventListener('keydown', (event) => {
    if (!window.__megabotMirrorEnabled) {
      return;
    }

    const allowed = ['Enter', 'Tab', 'Escape'];
    if (!allowed.includes(event.key)) {
      return;
    }

    const selector = getCssSelector(document.activeElement);
    relay('key', {
      selector,
      key: event.key,
      code: event.code || '',
      altKey: !!event.altKey,
      ctrlKey: !!event.ctrlKey,
      metaKey: !!event.metaKey,
      shiftKey: !!event.shiftKey
    });
  }, true);

  const scrollHandler = (event) => {
    if (!window.__megabotMirrorEnabled) {
      return;
    }

    const target = event.target || document;
    let selector = 'window';
    let scrollLeft = window.scrollX || 0;
    let scrollTop = window.scrollY || 0;

    if (
      target &&
      target !== document &&
      target !== document.documentElement &&
      target !== window &&
      target instanceof Element
    ) {
      selector = getCssSelector(target);
      scrollLeft = target.scrollLeft || 0;
      scrollTop = target.scrollTop || 0;
    }

    relay('scroll', {
      selector,
      scrollLeft,
      scrollTop
    });
  };

  window.addEventListener('scroll', scrollHandler, true);
  document.addEventListener('scroll', scrollHandler, true);

  window.megabotMirrorSetEnabled = (flag) => {
    window.__megabotMirrorEnabled = Boolean(flag);
  };
})();
`;

function noop() {}

function createLogger(baseLogger) {
  const fallback = {
    debug: console.log.bind(console),
    info: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console)
  };

  if (!baseLogger) {
    return fallback;
  }

  return {
    debug: typeof baseLogger.debug === 'function' ? baseLogger.debug.bind(baseLogger) : fallback.debug,
    info: typeof baseLogger.info === 'function' ? baseLogger.info.bind(baseLogger) : fallback.info,
    warn: typeof baseLogger.warn === 'function' ? baseLogger.warn.bind(baseLogger) : fallback.warn,
    error: typeof baseLogger.error === 'function' ? baseLogger.error.bind(baseLogger) : fallback.error
  };
}

class MirrorManager extends EventEmitter {
  constructor() {
    super();
    this.logger = createLogger(null);
    this.getActiveBrowserIds = null;
    this.resolveBrowserEntry = null;
    this.enabled = false;
    this.syncStates = null;
    this.controller = {
      id: null,
      page: null,
      handlers: null
    };
    this.controlled = new Map();
    this.assignmentPromise = Promise.resolve();
    this.exposedPages = new WeakSet();
  }

  configure(options = {}) {
    this.logger = createLogger(options.logger || null);
    this.getActiveBrowserIds = typeof options.getActiveBrowserIds === 'function' ? options.getActiveBrowserIds : null;
    this.resolveBrowserEntry = typeof options.resolveBrowserEntry === 'function' ? options.resolveBrowserEntry : null;
  }

  async enable(syncStates = null) {
    if (this.enabled) {
      this.syncStates = syncStates || null;
      await this.rebuildAssignments('enable-refresh');
      this.emitStatus();
      return Object.assign({ success: true, enabled: true }, this.pickStatusFields());
    }

    this.syncStates = syncStates || null;
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
    await this.cleanupController();
    this.cleanupControlledEntries(true);
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
      controllerId: this.controller.id,
      controlledIds: Array.from(this.controlled.keys()),
      syncStates: this.syncStates
    };
  }

  pickStatusFields() {
    return {
      controllerId: this.controller.id,
      controlledIds: Array.from(this.controlled.keys())
    };
  }

  emitStatus() {
    try {
      this.emit('status-changed', this.getStatus());
    } catch (error) {
      this.logger.warn('[Mirror] Falha ao emitir status:', error.message);
    }
  }

  handleActiveBrowsersChanged(reason = 'active-browsers-changed') {
    if (!this.enabled) {
      return;
    }

    this.assignmentPromise = this.assignmentPromise.then(async () => {
      const result = await this.rebuildAssignments(reason);

      if (!result.success) {
        this.logger.warn('[Mirror] %s', result.message || 'Falha ao atualizar modo espelho');
        await this.disableInternal(false);
      }

      this.emitStatus();
    }).catch((error) => {
      this.logger.error('[Mirror] Erro ao atualizar atribuicoes:', error.message);
    });
  }

  cleanupControlledEntries(detachOnly = false) {
    for (const [navigatorId, entry] of this.controlled.entries()) {
      if (entry.closeHandler && entry.page && !entry.page.isClosed()) {
        entry.page.removeListener('close', entry.closeHandler);
      }

      if (!detachOnly) {
        this.controlled.delete(navigatorId);
      }
    }
  }

  async rebuildAssignments(reason) {
    if (typeof this.getActiveBrowserIds !== 'function' || typeof this.resolveBrowserEntry !== 'function') {
      return {
        success: false,
        reason: 'not-configured',
        message: 'MirrorManager nao foi configurado.'
      };
    }

    const browserIds = this.getActiveBrowserIds(this.syncStates) || [];
    const available = [];

    for (const navigatorId of browserIds) {
      const data = this.resolveBrowserEntry(navigatorId);
      const page = data && data.page;

      if (!page || typeof page.isClosed === 'function' && page.isClosed()) {
        continue;
      }

      available.push({
        navigatorId,
        page
      });
    }

    if (available.length < 2) {
      return {
        success: false,
        reason: 'not-enough-browsers',
        message: 'E necessario pelo menos dois navegadores ativos para o modo espelho.'
      };
    }

    const controllerCandidate = available[0];

    try {
      await this.setController(controllerCandidate.navigatorId, controllerCandidate.page);
    } catch (error) {
      return {
        success: false,
        reason: 'controller-error',
        message: `Falha ao preparar controlador: ${error.message}`
      };
    }

    const updatedControlled = new Map();

    for (let index = 1; index < available.length; index += 1) {
      const candidate = available[index];
      const existing = this.controlled.get(candidate.navigatorId);

      if (existing) {
        this.attachControlledHandlers(existing, candidate.page);
        updatedControlled.set(candidate.navigatorId, existing);
      } else {
        const entry = this.createControlledEntry(candidate.navigatorId, candidate.page);
        updatedControlled.set(candidate.navigatorId, entry);
      }
    }

    this.cleanupControlledEntries(true);
    this.controlled = updatedControlled;

    return {
      success: true,
      controllerId: controllerCandidate.navigatorId,
      controlledIds: Array.from(updatedControlled.keys())
    };
  }

  async setController(navigatorId, page) {
    if (!page || typeof page.isClosed !== 'function' || page.isClosed()) {
      throw new Error('Pagina do controlador invalida');
    }

    if (this.controller.page === page) {
      this.controller.id = navigatorId;
      await this.ensureControllerBindings(page);
      await this.setControllerEnabled(page, true);
      return;
    }

    await this.cleanupController();

    this.controller.id = navigatorId;
    this.controller.page = page;

    await this.ensureControllerBindings(page);

    const domContentLoaded = async () => {
      try {
        await page.evaluate(mirrorControllerInjection);
      } catch (error) {
        this.logger.debug('[Mirror] Reinjecao (domcontentloaded) falhou: %s', error.message);
      }
    };

    const frameNavigated = async (frame) => {
      if (frame === page.mainFrame()) {
        try {
          await page.evaluate(mirrorControllerInjection);
        } catch (error) {
          this.logger.debug('[Mirror] Reinjecao (framenavigated) falhou: %s', error.message);
        }
      }
    };

    const closeHandler = () => {
      if (!this.enabled) {
        return;
      }

      this.controller.page = null;
      this.controller.id = null;
      this.handleActiveBrowsersChanged('controller-closed');
    };

    this.controller.handlers = {
      domContentLoaded,
      frameNavigated,
      closeHandler
    };

    page.on('domcontentloaded', domContentLoaded);
    page.on('framenavigated', frameNavigated);
    page.on('close', closeHandler);

    await this.setControllerEnabled(page, true);
  }

  async cleanupController() {
    const { page, handlers } = this.controller;

    if (handlers && page && !page.isClosed()) {
      page.removeListener('domcontentloaded', handlers.domContentLoaded || noop);
      page.removeListener('framenavigated', handlers.frameNavigated || noop);
      page.removeListener('close', handlers.closeHandler || noop);
    }

    if (page && !page.isClosed()) {
      try {
        await this.setControllerEnabled(page, false);
      } catch (error) {
        this.logger.debug('[Mirror] Falha ao desabilitar controlador:', error.message);
      }
    }

    this.controller = {
      id: null,
      page: null,
      handlers: null
    };
  }

  createControlledEntry(navigatorId, page) {
    const entry = {
      navigatorId,
      page,
      queues: {
        pointer: Promise.resolve(),
        typing: Promise.resolve(),
        key: Promise.resolve(),
        scroll: Promise.resolve()
      },
      closeHandler: null
    };

    this.attachControlledHandlers(entry, page);
    return entry;
  }

  attachControlledHandlers(entry, page) {
    if (!entry) {
      return;
    }

    if (entry.closeHandler && entry.page && !entry.page.isClosed()) {
      entry.page.removeListener('close', entry.closeHandler);
    }

    entry.page = page;

    const closeHandler = () => {
      if (!this.enabled) {
        return;
      }

      this.controlled.delete(entry.navigatorId);
      this.handleActiveBrowsersChanged('controlled-closed');
    };

    entry.closeHandler = closeHandler;

    if (page && typeof page.on === 'function') {
      page.on('close', closeHandler);
    }
  }

  async ensureControllerBindings(page) {
    if (!page || page.isClosed()) {
      return;
    }

    if (!this.exposedPages.has(page)) {
      try {
        await page.exposeFunction('megabotMirrorRelay', async (payload) => {
          if (!this.enabled) {
            return;
          }

          if (this.controller.page !== page) {
            return;
          }

          await this.handleMirrorPayload(payload);
        });
      } catch (error) {
        const message = error && error.message ? error.message : '';
        if (!String(message).includes('already exists')) {
          this.logger.warn('[Mirror] Falha ao expor funcao megabotMirrorRelay: %s', message);
        }
      }

      this.exposedPages.add(page);
    }

    try {
      await page.evaluateOnNewDocument(mirrorControllerInjection);
    } catch (error) {
      const message = error && error.message ? error.message : '';
      if (!String(message).includes('Execution context was destroyed')) {
        this.logger.debug('[Mirror] evaluateOnNewDocument falhou: %s', message);
      }
    }

    try {
      await page.evaluate(mirrorControllerInjection);
    } catch (error) {
      this.logger.debug('[Mirror] Injecao inicial falhou: %s', error.message);
    }
  }

  async setControllerEnabled(page, enabled) {
    if (!page || page.isClosed()) {
      return;
    }

    try {
      await page.evaluate((flag) => {
        if (typeof window.megabotMirrorSetEnabled === 'function') {
          window.megabotMirrorSetEnabled(flag);
        }
      }, Boolean(enabled));
    } catch (error) {
      this.logger.debug('[Mirror] Falha ao atualizar estado do controlador: %s', error.message);
    }
  }

  enqueue(entry, queueName, handler) {
    if (!entry || !handler) {
      return;
    }

    const currentQueue = entry.queues[queueName] || Promise.resolve();

    entry.queues[queueName] = currentQueue.then(async () => {
      if (!this.enabled) {
        return;
      }

      await handler();
    }).catch((error) => {
      this.logger.warn('[Mirror] Falha ao replicar %s no navegador %s: %s', queueName, entry.navigatorId, error.message);
      if (!entry.page || (typeof entry.page.isClosed === 'function' && entry.page.isClosed())) {
        this.controlled.delete(entry.navigatorId);
      }
    });
  }

  dispatch(queueName, handlerFactory) {
    for (const entry of this.controlled.values()) {
      this.enqueue(entry, queueName, () => handlerFactory(entry));
    }
  }

  async replicatePointer(entry, payload) {
    const page = entry.page;

    if (!page || page.isClosed()) {
      return;
    }

    const buttonName = MIRROR_BUTTON_MAP.hasOwnProperty(payload.button) ? MIRROR_BUTTON_MAP[payload.button] : 'left';
    const x = typeof payload.x === 'number' ? payload.x : 0;
    const y = typeof payload.y === 'number' ? payload.y : 0;

    if (payload.pointerType === 'touch') {
      await page.touchscreen.tap(x, y);
      return;
    }

    await page.mouse.move(x, y, { steps: 1 });
    await page.mouse.down({ button: buttonName });
    await page.mouse.up({ button: buttonName });
  }

  async replicateInput(entry, payload) {
    const page = entry.page;

    if (!page || page.isClosed()) {
      return;
    }

    if (!payload.selector) {
      return;
    }

    await page.evaluate((selector, state) => {
      const element = document.querySelector(selector);
      if (!element) {
        return false;
      }

      if (state.isContentEditable) {
        element.innerText = state.value || '';
        element.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }

      const tagName = state.tagName;
      const fieldType = state.fieldType;

      if (tagName === 'input' && (fieldType === 'checkbox' || fieldType === 'radio')) {
        element.checked = Boolean(state.checked);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }

      if (state.value !== undefined) {
        const proto = Object.getPrototypeOf(element);
        const descriptor =
          (proto && Object.getOwnPropertyDescriptor(proto, 'value')) ||
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value') ||
          Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');

        if (descriptor && typeof descriptor.set === 'function') {
          descriptor.set.call(element, state.value);
        } else {
          element.value = state.value;
        }
      }

      if (
        typeof state.selectionStart === 'number' &&
        typeof state.selectionEnd === 'number' &&
        typeof element.setSelectionRange === 'function'
      ) {
        try {
          element.setSelectionRange(state.selectionStart, state.selectionEnd);
        } catch (error) {
          // ignorar erros de selecao
        }
      }

      element.dispatchEvent(new Event('input', { bubbles: true }));

      if (tagName === 'select') {
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }

      return true;
    }, payload.selector, {
      value: payload.value,
      tagName: payload.tagName,
      fieldType: payload.fieldType,
      checked: payload.checked,
      selectionStart: payload.selectionStart,
      selectionEnd: payload.selectionEnd,
      isContentEditable: payload.isContentEditable
    });
  }

  async replicateKey(entry, payload) {
    const page = entry.page;

    if (!page || page.isClosed()) {
      return;
    }

    if (payload.selector) {
      try {
        await page.focus(payload.selector);
      } catch (error) {
        this.logger.debug('[Mirror] Nao foi possivel focar seletor %s: %s', payload.selector, error.message);
      }
    }

    const modifiers = [
      { active: payload.ctrlKey, code: 'Control' },
      { active: payload.altKey, code: 'Alt' },
      { active: payload.metaKey, code: 'Meta' },
      { active: payload.shiftKey, code: 'Shift' }
    ];

    for (const modifier of modifiers) {
      if (modifier.active) {
        await page.keyboard.down(modifier.code);
      }
    }

    await page.keyboard.press(payload.key);

    for (let index = modifiers.length - 1; index >= 0; index -= 1) {
      const modifier = modifiers[index];
      if (modifier.active) {
        await page.keyboard.up(modifier.code);
      }
    }
  }

  async replicateScroll(entry, payload) {
    const page = entry.page;

    if (!page || page.isClosed()) {
      return;
    }

    const selector = payload.selector || 'window';
    const left = typeof payload.scrollLeft === 'number' ? payload.scrollLeft : 0;
    const top = typeof payload.scrollTop === 'number' ? payload.scrollTop : 0;

    if (selector === 'window') {
      await page.evaluate((scrollLeft, scrollTop) => {
        window.scrollTo(scrollLeft, scrollTop);
      }, left, top);
      return;
    }

    await page.evaluate((sel, scrollLeft, scrollTop) => {
      const element = document.querySelector(sel);
      if (!element) {
        return false;
      }

      element.scrollLeft = scrollLeft;
      element.scrollTop = scrollTop;
      return true;
    }, selector, left, top);
  }

  async handleMirrorPayload(payload) {
    if (!payload || typeof payload !== 'object') {
      return;
    }

    switch (payload.type) {
      case 'pointer':
        this.dispatch('pointer', (entry) => this.replicatePointer(entry, payload));
        break;
      case 'input':
        if (payload.selector) {
          this.dispatch('typing', (entry) => this.replicateInput(entry, payload));
        }
        break;
      case 'key':
        if (payload.key && MIRROR_ALLOWED_KEYS.has(payload.key)) {
          this.dispatch('key', (entry) => this.replicateKey(entry, payload));
        }
        break;
      case 'scroll':
        this.dispatch('scroll', (entry) => this.replicateScroll(entry, payload));
        break;
      default:
        break;
    }
  }
}

module.exports = new MirrorManager();
