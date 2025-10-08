const { EventEmitter } = require('events');

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

  const TEXTUAL_EXCLUDED_TYPES = new Set([
    'button',
    'checkbox',
    'color',
    'file',
    'hidden',
    'image',
    'radio',
    'range',
    'reset',
    'submit'
  ]);
  const fieldStates = new WeakMap();
  const beforeInputStates = new WeakMap();
  const KEY_ALWAYS_RELAY = new Set([
    'Enter',
    'Tab',
    'Escape',
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'PageUp',
    'PageDown',
    'Home',
    'End',
    'Insert',
    'Backspace',
    'Delete'
  ]);
  const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta']);
  const SKIP_TEXT_INPUT_TYPES = new Set([
    'deleteContentBackward',
    'deleteContentForward',
    'deleteSoftLineBackward',
    'deleteSoftLineForward',
    'deleteHardLineBackward',
    'deleteHardLineForward',
    'deleteWordBackward',
    'deleteWordForward',
    'deleteEntireSoftLine',
    'deleteEntireHardLine',
    'deleteByCut',
    'deleteByDrag',
    'insertLineBreak',
    'insertParagraph'
  ]);

  const isTextualField = (tagName, fieldType, isContentEditable) => {
    if (isContentEditable) {
      return true;
    }

    if (!tagName) {
      return false;
    }

    if (tagName === 'textarea') {
      return true;
    }

    if (tagName === 'input') {
      const normalized = String(fieldType || 'text').toLowerCase();
      return !TEXTUAL_EXCLUDED_TYPES.has(normalized);
    }

    return false;
  };

  const readFieldValue = (element, isContentEditable) => {
    if (!element) {
      return '';
    }

    if (isContentEditable) {
      return element.innerText || '';
    }

    if (typeof element.value === 'string') {
      return element.value;
    }

    if (typeof element.value === 'number') {
      return String(element.value);
    }

    return '';
  };

  const captureSelectionState = (element) => {
    if (!element) {
      return {
        selectionStart: null,
        selectionEnd: null,
        selectionDirection: null
      };
    }

    const result = {
      selectionStart: null,
      selectionEnd: null,
      selectionDirection: null
    };

    if (typeof element.selectionStart === 'number') {
      result.selectionStart = element.selectionStart;
    }

    if (typeof element.selectionEnd === 'number') {
      result.selectionEnd = element.selectionEnd;
    }

    if (typeof element.selectionDirection === 'string') {
      result.selectionDirection = element.selectionDirection;
    }

    return result;
  };

  const diffTextContent = (previous, current) => {
    if (previous === current) {
      return {
        start: current.length,
        deleteCount: 0,
        insertedText: '',
        removedText: ''
      };
    }

    const prevLength = previous.length;
    const currentLength = current.length;
    let start = 0;
    while (start < prevLength && start < currentLength && previous[start] === current[start]) {
      start += 1;
    }

    let prevEnd = prevLength;
    let currentEnd = currentLength;
    while (prevEnd > start && currentEnd > start && previous[prevEnd - 1] === current[currentEnd - 1]) {
      prevEnd -= 1;
      currentEnd -= 1;
    }

    return {
      start,
      deleteCount: prevEnd - start,
      insertedText: current.slice(start, currentEnd),
      removedText: previous.slice(start, prevEnd)
    };
  };

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

  const buildPointerPayload = (event, phase, overrides = {}) => {
    if (!event) {
      return null;
    }

    const pointerType = overrides.pointerType ||
      (event.pointerType ? String(event.pointerType).toLowerCase() : (
        event.type && event.type.startsWith('touch') ? 'touch' : 'mouse'
      ));

    const pointerId = overrides.pointerId ??
      (typeof event.pointerId === 'number' ? event.pointerId :
        typeof overrides.pointerId === 'number' ? overrides.pointerId :
          (pointerType === 'mouse' ? 1 : 0));

    const clientX = typeof overrides.clientX === 'number'
      ? overrides.clientX
      : (typeof event.clientX === 'number' ? event.clientX : (overrides.clientX || 0));

    const clientY = typeof overrides.clientY === 'number'
      ? overrides.clientY
      : (typeof event.clientY === 'number' ? event.clientY : (overrides.clientY || 0));

    const pageX = typeof overrides.pageX === 'number'
      ? overrides.pageX
      : (typeof event.pageX === 'number' ? event.pageX : clientX);

    const pageY = typeof overrides.pageY === 'number'
      ? overrides.pageY
      : (typeof event.pageY === 'number' ? event.pageY : clientY);

    const pressure = typeof overrides.pressure === 'number'
      ? overrides.pressure
      : (typeof event.pressure === 'number'
        ? event.pressure
        : (phase === 'up' || phase === 'cancel' ? 0 : 0.5));

    const radiusX = typeof overrides.radiusX === 'number'
      ? overrides.radiusX
      : (typeof event.width === 'number' && event.width > 0 ? event.width / 2 : 15);

    const radiusY = typeof overrides.radiusY === 'number'
      ? overrides.radiusY
      : (typeof event.height === 'number' && event.height > 0 ? event.height / 2 : 15);

    const rawButton = typeof overrides.button === 'number'
      ? overrides.button
      : (typeof event.button === 'number' ? event.button : 0);

    const normalizedButton = phase === 'move' && rawButton === -1 ? 0 : rawButton;

    const payload = {
      phase,
      pointerType,
      pointerId,
      button: normalizedButton,
      buttons: typeof overrides.buttons === 'number'
        ? overrides.buttons
        : (typeof event.buttons === 'number' ? event.buttons : (phase === 'down' || phase === 'move' ? 1 : 0)),
      x: clientX,
      y: clientY,
      pageX,
      pageY,
      screenX: typeof overrides.screenX === 'number'
        ? overrides.screenX
        : (typeof event.screenX === 'number' ? event.screenX : clientX),
      screenY: typeof overrides.screenY === 'number'
        ? overrides.screenY
        : (typeof event.screenY === 'number' ? event.screenY : clientY),
      pressure,
      radiusX,
      radiusY,
      rotationAngle: typeof overrides.rotationAngle === 'number'
        ? overrides.rotationAngle
        : (typeof event.rotationAngle === 'number' ? event.rotationAngle : 0),
      tiltX: typeof overrides.tiltX === 'number'
        ? overrides.tiltX
        : (typeof event.tiltX === 'number' ? event.tiltX : 0),
      tiltY: typeof overrides.tiltY === 'number'
        ? overrides.tiltY
        : (typeof event.tiltY === 'number' ? event.tiltY : 0),
      altitudeAngle: typeof overrides.altitudeAngle === 'number'
        ? overrides.altitudeAngle
        : (typeof event.altitudeAngle === 'number' ? event.altitudeAngle : null),
      azimuthAngle: typeof overrides.azimuthAngle === 'number'
        ? overrides.azimuthAngle
        : (typeof event.azimuthAngle === 'number' ? event.azimuthAngle : null),
      isPrimary: typeof overrides.isPrimary === 'boolean'
        ? overrides.isPrimary
        : !!event.isPrimary,
      altKey: !!event.altKey,
      ctrlKey: !!event.ctrlKey,
      metaKey: !!event.metaKey,
      shiftKey: !!event.shiftKey,
      timestamp: typeof performance !== 'undefined' && performance && typeof performance.now === 'function'
        ? performance.now()
        : Date.now()
    };

    return payload;
  };

  const pointerEventHandler = (phase) => (event) => {
    if (!window.__megabotMirrorEnabled) {
      return;
    }

    if (!event || event.isTrusted === false) {
      return;
    }

    const payload = buildPointerPayload(event, phase);
    if (!payload) {
      return;
    }

    relay('pointer', payload);
  };

  const touchEventHandler = (phase) => (event) => {
    if (!window.__megabotMirrorEnabled) {
      return;
    }

    if (!event || event.isTrusted === false) {
      return;
    }

    if (!event.changedTouches || event.changedTouches.length === 0) {
      return;
    }

    for (let index = 0; index < event.changedTouches.length; index += 1) {
      const touch = event.changedTouches[index];
      if (!touch) {
        continue;
      }

      const payload = buildPointerPayload(event, phase, {
        pointerType: 'touch',
        pointerId: typeof touch.identifier === 'number' ? touch.identifier : index,
        clientX: typeof touch.clientX === 'number' ? touch.clientX : 0,
        clientY: typeof touch.clientY === 'number' ? touch.clientY : 0,
        pageX: typeof touch.pageX === 'number' ? touch.pageX : touch.clientX,
        pageY: typeof touch.pageY === 'number' ? touch.pageY : touch.clientY,
        screenX: typeof touch.screenX === 'number' ? touch.screenX : touch.clientX,
        screenY: typeof touch.screenY === 'number' ? touch.screenY : touch.clientY,
        radiusX: typeof touch.radiusX === 'number' ? touch.radiusX : 15,
        radiusY: typeof touch.radiusY === 'number' ? touch.radiusY : 15,
        rotationAngle: typeof touch.rotationAngle === 'number' ? touch.rotationAngle : 0,
        pressure: typeof touch.force === 'number' ? touch.force : (phase === 'up' ? 0 : 0.5),
        isPrimary: index === 0
      });

      if (payload) {
        relay('pointer', payload);
      }
    }
  };

  const mouseFallbackHandler = (phase) => (event) => {
    if (!window.__megabotMirrorEnabled) {
      return;
    }

    if (!event || event.isTrusted === false) {
      return;
    }

    if (phase === 'move' && typeof event.buttons === 'number' && event.buttons === 0) {
      return;
    }

    const payload = buildPointerPayload(event, phase, {
      pointerType: 'mouse',
      pointerId: 1
    });

    if (payload) {
      relay('pointer', payload);
    }
  };

  if (window.PointerEvent) {
    window.addEventListener('pointerdown', pointerEventHandler('down'), true);
    window.addEventListener('pointermove', pointerEventHandler('move'), true);
    window.addEventListener('pointerup', pointerEventHandler('up'), true);
    window.addEventListener('pointercancel', pointerEventHandler('cancel'), true);
  } else {
    window.addEventListener('mousedown', mouseFallbackHandler('down'), true);
    window.addEventListener('mousemove', mouseFallbackHandler('move'), true);
    window.addEventListener('mouseup', mouseFallbackHandler('up'), true);
    document.addEventListener('touchstart', touchEventHandler('down'), true);
    document.addEventListener('touchmove', touchEventHandler('move'), true);
    document.addEventListener('touchend', touchEventHandler('up'), true);
    document.addEventListener('touchcancel', touchEventHandler('cancel'), true);
  }

  const shouldRelayKeyEvent = (event) => {
    if (!event) {
      return false;
    }

    if (MODIFIER_KEYS.has(event.key)) {
      return true;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) {
      return true;
    }

    if (KEY_ALWAYS_RELAY.has(event.key)) {
      return true;
    }

    if (typeof event.key === 'string' && /^F(\\d{1,2})$/.test(event.key)) {
      return true;
    }

    if (event.key === 'ContextMenu') {
      return true;
    }

    return false;
  };

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

    payload.isTextual = isTextualField(tagName, fieldType, payload.isContentEditable);

    if (typeof target?.selectionStart === 'number' && typeof target?.selectionEnd === 'number') {
      payload.selectionStart = target.selectionStart;
      payload.selectionEnd = target.selectionEnd;
    }

    if (typeof target?.selectionDirection === 'string') {
      payload.selectionDirection = target.selectionDirection;
    }

    return payload;
  };

  const beforeInputHandler = (event) => {
    if (!window.__megabotMirrorEnabled) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const tagName = target && target.tagName ? target.tagName.toLowerCase() : '';
    const fieldType = target && target.type ? String(target.type).toLowerCase() : '';
    const isContentEditable = !!(target && target.isContentEditable);
    const isTextual = isTextualField(tagName, fieldType, isContentEditable);

    const selectionState = captureSelectionState(target);

    beforeInputStates.set(target, {
      value: isTextual ? readFieldValue(target, isContentEditable) : target && target.value !== undefined ? target.value : '',
      selectionStart: selectionState.selectionStart,
      selectionEnd: selectionState.selectionEnd,
      selectionDirection: selectionState.selectionDirection
    });
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
    payload.inputTimestamp = Date.now();
    payload.data = typeof event.data === 'string' ? event.data : null;

    const previousState =
      beforeInputStates.get(target) ||
      fieldStates.get(target) || {
        value: payload.isTextual ? '' : payload.value,
        selectionStart: typeof payload.selectionStart === 'number' ? payload.selectionStart : null,
        selectionEnd: typeof payload.selectionEnd === 'number' ? payload.selectionEnd : null,
        selectionDirection: payload.selectionDirection || null
      };

    beforeInputStates.delete(target);

    if (payload.isTextual) {
      const currentValue = readFieldValue(target, payload.isContentEditable);
      const prevValue = typeof previousState?.value === 'string' ? previousState.value : '';
      const diff = diffTextContent(prevValue, currentValue);

      payload.rangeStart = diff.start;
      payload.rangeEnd = diff.start + diff.deleteCount;
      payload.insertedText = diff.insertedText;
      payload.removedText = diff.removedText;

      payload.previousSelectionStart =
        typeof previousState?.selectionStart === 'number' ? previousState.selectionStart : null;
      payload.previousSelectionEnd =
        typeof previousState?.selectionEnd === 'number' ? previousState.selectionEnd : null;
      payload.previousSelectionDirection =
        typeof previousState?.selectionDirection === 'string' ? previousState.selectionDirection : null;

      payload.finalSelectionStart =
        typeof target.selectionStart === 'number' ? target.selectionStart : null;
      payload.finalSelectionEnd =
        typeof target.selectionEnd === 'number' ? target.selectionEnd : null;
      payload.finalSelectionDirection =
        typeof target.selectionDirection === 'string' ? target.selectionDirection : null;

      delete payload.value;
      payload.skipTextSync = Boolean(payload.inputType && SKIP_TEXT_INPUT_TYPES.has(payload.inputType));

      fieldStates.set(target, {
        value: currentValue,
        selectionStart: payload.finalSelectionStart,
        selectionEnd: payload.finalSelectionEnd,
        selectionDirection: payload.finalSelectionDirection
      });
    } else {
      fieldStates.set(target, {
        value: payload.value,
        selectionStart: typeof payload.selectionStart === 'number' ? payload.selectionStart : null,
        selectionEnd: typeof payload.selectionEnd === 'number' ? payload.selectionEnd : null,
        selectionDirection: payload.selectionDirection || null
      });
    }

    relay('input', payload);
  };

  document.addEventListener('beforeinput', beforeInputHandler, true);
  document.addEventListener('input', inputHandler, true);
  document.addEventListener('change', inputHandler, true);

  const keyRelayHandler = (event) => {
    if (!window.__megabotMirrorEnabled) {
      return;
    }

    if (!event || event.isTrusted === false) {
      return;
    }

    if (!shouldRelayKeyEvent(event)) {
      return;
    }

    const activeElement = document.activeElement;
    const selector = getCssSelector(activeElement);
    const tagName = activeElement && activeElement.tagName ? activeElement.tagName.toLowerCase() : '';
    const fieldType = activeElement && activeElement.type ? String(activeElement.type).toLowerCase() : '';
    const isContentEditable = !!(activeElement && activeElement.isContentEditable);

    relay('key', {
      selector,
      key: event.key,
      code: event.code || '',
      keyCode: typeof event.keyCode === 'number' ? event.keyCode : 0,
      altKey: !!event.altKey,
      ctrlKey: !!event.ctrlKey,
      metaKey: !!event.metaKey,
      shiftKey: !!event.shiftKey,
      repeat: !!event.repeat,
      eventType: event.type,
      targetTagName: tagName,
      targetFieldType: fieldType,
      targetIsContentEditable: isContentEditable,
      targetIsTextual: isTextualField(tagName, fieldType, isContentEditable)
    });
  };

  window.addEventListener('keydown', keyRelayHandler, true);
  window.addEventListener('keyup', keyRelayHandler, true);

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

      if (entry.touchSession && typeof entry.touchSession.detach === 'function') {
        try {
          entry.touchSession.detach();
        } catch (error) {
          // ignorar falhas ao encerrar sessao cdp
        }
      }

      entry.touchSession = null;

      if (entry.activePointers && typeof entry.activePointers.clear === 'function') {
        entry.activePointers.clear();
      }

      if (entry.mouseButtons && typeof entry.mouseButtons.clear === 'function') {
        entry.mouseButtons.clear();
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
      closeHandler: null,
      pressedKeys: new Set(),
      activePointers: new Map(),
      touchSession: null,
      mouseButtons: new Set()
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
    entry.activePointers = new Map();
    entry.mouseButtons = new Set();

    if (entry.touchSession && typeof entry.touchSession.detach === 'function') {
      try {
        entry.touchSession.detach();
      } catch (error) {
        // ignorar falhas ao encerrar sessao anterior
      }
    }

    entry.touchSession = null;

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

  computeModifierMask(payload) {
    if (!payload || typeof payload !== 'object') {
      return 0;
    }

    let mask = 0;

    if (payload.altKey) {
      mask |= 1;
    }

    if (payload.ctrlKey) {
      mask |= 2;
    }

    if (payload.metaKey) {
      mask |= 4;
    }

    if (payload.shiftKey) {
      mask |= 8;
    }

    return mask;
  }

  async replicatePointer(entry, payload) {
    const page = entry.page;

    if (!page || page.isClosed()) {
      return;
    }

    if (!payload || typeof payload !== 'object') {
      return;
    }

    let phase = typeof payload.phase === 'string' ? payload.phase.toLowerCase() : null;
    const pointerType = typeof payload.pointerType === 'string' ? payload.pointerType.toLowerCase() : 'mouse';
    const pointerId = typeof payload.pointerId === 'number' ? payload.pointerId : 1;
    const button = typeof payload.button === 'number' ? payload.button : 0;
    const x = typeof payload.x === 'number' ? payload.x : 0;
    const y = typeof payload.y === 'number' ? payload.y : 0;
    const buttonsState =
      typeof payload.buttons === 'number' ? payload.buttons : (phase === 'down' ? 1 : 0);

    const fallbackSimpleTap = !phase || !['down', 'move', 'up', 'cancel'].includes(phase);
    const shouldUseMouse =
      pointerType === 'mouse' &&
      (button !== 0 || buttonsState === 2 || buttonsState === 4);

    const hasPointer =
      entry.activePointers &&
      typeof entry.activePointers.has === 'function' &&
      entry.activePointers.has(pointerId);

    if (phase === 'move' && buttonsState > 0 && !hasPointer) {
      phase = 'down';
    } else if (phase === 'move' && buttonsState === 0 && pointerType !== 'touch' && !hasPointer) {
      return;
    }

    if (fallbackSimpleTap) {
      if (entry.activePointers && typeof entry.activePointers.clear === 'function') {
        entry.activePointers.clear();
      }

      if (pointerType === 'touch' && page.touchscreen && typeof page.touchscreen.tap === 'function') {
        await page.touchscreen.tap(x, y);
        return;
      }

      const buttonName = MIRROR_BUTTON_MAP.hasOwnProperty(button) ? MIRROR_BUTTON_MAP[button] : 'left';
      await page.mouse.move(x, y, { steps: 1 });
      await page.mouse.down({ button: buttonName });
      await page.mouse.up({ button: buttonName });
      return;
    }

    if (shouldUseMouse) {
      if (entry.activePointers && typeof entry.activePointers.clear === 'function') {
        entry.activePointers.clear();
      }

      if (!entry.mouseButtons || typeof entry.mouseButtons.add !== 'function') {
        entry.mouseButtons = new Set();
      }

      const buttonName = MIRROR_BUTTON_MAP.hasOwnProperty(button) ? MIRROR_BUTTON_MAP[button] : 'left';

      if (phase === 'down') {
        await page.mouse.move(x, y, { steps: 1 });
        await page.mouse.down({ button: buttonName });
        entry.mouseButtons.add(buttonName);
        return;
      }

      if (phase === 'move') {
        await page.mouse.move(x, y, { steps: 1 });
        return;
      }

      if (phase === 'up' || phase === 'cancel') {
        if (entry.mouseButtons.has(buttonName)) {
          await page.mouse.move(x, y, { steps: 1 });
          await page.mouse.up({ button: buttonName });
          entry.mouseButtons.delete(buttonName);
        } else {
          await page.mouse.move(x, y, { steps: 1 });
          await page.mouse.up({ button: buttonName });
        }
        return;
      }
    }

    if (!entry.activePointers || typeof entry.activePointers.set !== 'function') {
      entry.activePointers = new Map();
    }

    let session = entry.touchSession;

    if (!session) {
      try {
        if (typeof page.createCDPSession === 'function') {
          session = await page.createCDPSession();
        } else if (typeof page.target === 'function' && page.target()) {
          session = await page.target().createCDPSession();
        } else if (typeof page._client === 'function') {
          session = page._client();
        }
        entry.touchSession = session;
      } catch (error) {
        this.logger.debug('[Mirror] Falha ao criar sessao CDP para toque: %s', error.message);
        session = null;
      }
    }

    if (!session) {
      const buttonName = MIRROR_BUTTON_MAP.hasOwnProperty(button) ? MIRROR_BUTTON_MAP[button] : 'left';
      await page.mouse.move(x, y, { steps: 1 });
      await page.mouse.down({ button: buttonName });
      await page.mouse.up({ button: buttonName });
      return;
    }

    const clamp = (value, min, max, fallback) => {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return fallback;
      }
      return Math.min(Math.max(value, min), max);
    };

    const force = clamp(
      typeof payload.pressure === 'number' ? payload.pressure : (phase === 'up' || phase === 'cancel' ? 0 : 0.5),
      0,
      1,
      phase === 'up' || phase === 'cancel' ? 0 : 0.5
    );

    const radiusX = clamp(
      typeof payload.radiusX === 'number' ? payload.radiusX : 15,
      1,
      100,
      15
    );

    const radiusY = clamp(
      typeof payload.radiusY === 'number' ? payload.radiusY : 15,
      1,
      100,
      15
    );

    const rotationAngle = typeof payload.rotationAngle === 'number' ? payload.rotationAngle : 0;

    const pointerState = {
      x,
      y,
      radiusX,
      radiusY,
      rotationAngle,
      force,
      id: pointerId
    };

    const activePointers = entry.activePointers;

    if (phase === 'down') {
      activePointers.set(pointerId, pointerState);
    } else if (phase === 'move') {
      if (activePointers.has(pointerId)) {
        activePointers.set(pointerId, pointerState);
      } else {
        // se nao houver registro, tratar como novo toque
        activePointers.set(pointerId, pointerState);
      }
    } else if (phase === 'up') {
      if (activePointers.has(pointerId)) {
        activePointers.delete(pointerId);
      }
    } else if (phase === 'cancel') {
      activePointers.clear();
    }

    const typeMap = {
      down: 'touchStart',
      move: 'touchMove',
      up: 'touchEnd',
      cancel: 'touchCancel'
    };

    const eventType = typeMap[phase] || 'touchStart';
    const touchPoints =
      eventType === 'touchEnd' || eventType === 'touchCancel'
        ? Array.from(activePointers.values())
        : Array.from(activePointers.entries()).map(([id, state]) => {
            if (!state || typeof state !== 'object') {
              return { x, y, radiusX, radiusY, rotationAngle, force, id };
            }
            return Object.assign({ id }, state);
          });

    const modifiers = this.computeModifierMask(payload);
    const timestamp = typeof payload.timestamp === 'number' ? payload.timestamp / 1000 : undefined;

    try {
      await session.send('Input.dispatchTouchEvent', {
        type: eventType,
        touchPoints,
        modifiers,
        timestamp,
        pointerType: pointerType === 'pen' ? 'pen' : 'touch'
      });
    } catch (error) {
      this.logger.debug('[Mirror] Falha ao enviar evento de toque (%s): %s', eventType, error.message);
      if (activePointers && typeof activePointers.clear === 'function') {
        activePointers.clear();
      }
      if (
        error.message &&
        (error.message.includes('detached') || error.message.includes('closed') || error.message.includes('target closed'))
      ) {
        if (entry.touchSession && typeof entry.touchSession.detach === 'function') {
          try {
            entry.touchSession.detach();
          } catch (detachError) {
            // ignorar
          }
        }
        entry.touchSession = null;
      }
    }
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

      const tagName = (state.tagName || '').toLowerCase();
      const fieldType = (state.fieldType || '').toLowerCase();
      const isContentEditable = Boolean(state.isContentEditable ?? element.isContentEditable);
      const textualField =
        Boolean(state.isTextual) ||
        isContentEditable ||
        tagName === 'textarea' ||
        (tagName === 'input' &&
          !['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'].includes(fieldType));

      const readValue = () => {
        if (isContentEditable) {
          return element.innerText || '';
        }

        if (typeof element.value === 'string') {
          return element.value;
        }

        if (typeof element.value === 'number') {
          return String(element.value);
        }

        return '';
      };

      const writeValue = (value) => {
        if (isContentEditable) {
          element.innerText = value;
          return;
        }

        const proto = Object.getPrototypeOf(element);
        const descriptor =
          (proto && Object.getOwnPropertyDescriptor(proto, 'value')) ||
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value') ||
          Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');

        if (descriptor && typeof descriptor.set === 'function') {
          descriptor.set.call(element, value);
        } else {
          element.value = value;
        }
      };

      const dispatchInputEvent = (detail) => {
        try {
          const init = {
            bubbles: true,
            cancelable: false,
            composed: false,
            inputType: detail.inputType || 'insertText',
            data: typeof detail.data === 'string' ? detail.data : null
          };
          const inputEvent = typeof InputEvent === 'function'
            ? new InputEvent('input', init)
            : null;

          if (inputEvent) {
            element.dispatchEvent(inputEvent);
            return;
          }
        } catch (error) {
          // ignorar falhas e fazer fallback para Event padrao
        }

        element.dispatchEvent(new Event('input', { bubbles: true }));
      };

      if (
        textualField &&
        !state.skipTextSync &&
        typeof state.rangeStart === 'number' &&
        typeof state.rangeEnd === 'number' &&
        state.insertedText !== undefined
      ) {
        const currentValue = readValue();
        const maxLength = currentValue.length;
        const start = Math.max(0, Math.min(state.rangeStart, maxLength));
        const end = Math.max(start, Math.min(state.rangeEnd, maxLength));
        const insertedText = typeof state.insertedText === 'string' ? state.insertedText : '';

        if (!isContentEditable && typeof element.setRangeText === 'function') {
          try {
            element.setRangeText(insertedText, start, end, 'preserve');
          } catch (error) {
            const updated = currentValue.slice(0, start) + insertedText + currentValue.slice(end);
            writeValue(updated);
          }
        } else {
          const updated = currentValue.slice(0, start) + insertedText + currentValue.slice(end);
          writeValue(updated);
        }

        if (
          !isContentEditable &&
          typeof state.finalSelectionStart === 'number' &&
          typeof state.finalSelectionEnd === 'number' &&
          typeof element.setSelectionRange === 'function'
        ) {
          try {
            element.setSelectionRange(
              state.finalSelectionStart,
              state.finalSelectionEnd,
              state.finalSelectionDirection || 'none'
            );
          } catch (error) {
            // ignorar erros de selecao
          }
        }

        dispatchInputEvent({
          inputType: state.inputType || null,
          data: state.data !== undefined ? state.data : insertedText
        });

        return true;
      }

      if (tagName === 'input' && (fieldType === 'checkbox' || fieldType === 'radio')) {
        element.checked = Boolean(state.checked);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }

      if (tagName === 'select') {
        if (state.value !== undefined) {
          element.value = state.value;
        }

        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }

      if (state.value !== undefined) {
        writeValue(state.value);

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
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }

      return false;
    }, payload.selector, {
      tagName: payload.tagName,
      fieldType: payload.fieldType,
      isContentEditable: payload.isContentEditable,
      isTextual: payload.isTextual,
      rangeStart: payload.rangeStart,
      rangeEnd: payload.rangeEnd,
      insertedText: payload.insertedText,
      data: payload.data,
      inputType: payload.inputType,
      skipTextSync: payload.skipTextSync,
      finalSelectionStart: payload.finalSelectionStart,
      finalSelectionEnd: payload.finalSelectionEnd,
      finalSelectionDirection: payload.finalSelectionDirection,
      value: payload.value,
      checked: payload.checked,
      selectionStart: payload.selectionStart,
      selectionEnd: payload.selectionEnd
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

    const eventType = payload.eventType === 'keyup' ? 'keyup' : 'keydown';
    const keyIdentifier = payload.code || payload.key;

    if (!keyIdentifier || typeof keyIdentifier !== 'string') {
      return;
    }

    const pressedKeys = entry.pressedKeys || (entry.pressedKeys = new Set());
    const keyToken = keyIdentifier;

    try {
      if (eventType === 'keydown') {
        if (pressedKeys.has(keyToken) && !payload.repeat) {
          try {
            await page.keyboard.up(keyIdentifier);
          } catch (internalError) {
            // ignorar tentativa de soltar tecla presa
          }
          pressedKeys.delete(keyToken);
        }

        if (!pressedKeys.has(keyToken)) {
          await page.keyboard.down(keyIdentifier);
          pressedKeys.add(keyToken);
        } else if (payload.repeat) {
          try {
            await page.keyboard.down(keyIdentifier);
          } catch (internalError) {
            // ignorar repeticoes que o chromium rejeitar
          }
        }

        return;
      }

      if (eventType === 'keyup') {
        if (pressedKeys.has(keyToken)) {
          pressedKeys.delete(keyToken);
        }

        await page.keyboard.up(keyIdentifier);
      }
    } catch (error) {
      this.logger.debug('[Mirror] Falha ao replicar evento de tecla %s (%s): %s', keyIdentifier, eventType, error.message);
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
        if (payload && payload.key) {
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
