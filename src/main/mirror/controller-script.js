function createControllerScript(config = {}) {
  const serializedConfig = JSON.stringify({
    room: config.room || 'default',
    navigatorId: config.navigatorId || null
  });

  const controllerBundle = function controllerBundle(CONFIG) {
    if (window.__megabotMirrorLeaderInjected_v1) {
      return;
    }

    window.__megabotMirrorLeaderInjected_v1 = true;

    const ROOM = CONFIG && CONFIG.room ? CONFIG.room : 'default';
    const NAVIGATOR_ID = CONFIG && CONFIG.navigatorId ? CONFIG.navigatorId : null;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const getSegments = () => {
      const segments = [];

      const pushSegment = (node, rect, path) => {
        segments.push({
          rect,
          path,
          nodeName: node.nodeName,
          scroll: {
            left: node.scrollLeft || 0,
            top: node.scrollTop || 0
          }
        });
      };

      try {
        const walker = document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_DOCUMENT, null);
        let current = walker.currentNode;
        while (current) {
          if (current === document.documentElement || current === document.body) {
            current = walker.nextNode();
            continue;
          }

          if (current instanceof HTMLElement || current instanceof SVGElement) {
            const rect = current.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              const path = [];
              let node = current;
              while (node && node !== document.documentElement) {
                if (!node.parentElement) {
                  break;
                }
                const siblings = Array.from(node.parentElement.children);
                const index = siblings.indexOf(node);
                path.unshift(index);
                node = node.parentElement;
              }
              pushSegment(current, rect, path);
            }
          }

          current = walker.nextNode();
        }
      } catch (error) {
        // ignore
      }

      return segments;
    };

    const visualViewportSnapshot = () => {
      const vv = window.visualViewport;
      if (!vv) {
        return null;
      }

      return {
        w: vv.width,
        h: vv.height,
        scale: vv.scale,
        pageLeft: vv.pageLeft,
        pageTop: vv.pageTop,
        offsetLeft: vv.offsetLeft,
        offsetTop: vv.offsetTop
      };
    };

    const send = (type, data = {}) => {
      if (typeof window.mirrorEmit !== 'function') {
        return;
      }

      try {
        window.mirrorEmit({
          role: 'leader',
          room: ROOM,
          navigatorId: NAVIGATOR_ID,
          type,
          ts: performance.now(),
          url: window.location.href,
          top: window === window.top,
          inner: { w: window.innerWidth, h: window.innerHeight },
          outer: { w: window.outerWidth, h: window.outerHeight },
          scroll: { x: window.scrollX, y: window.scrollY },
          vv: visualViewportSnapshot(),
          segments: getSegments(),
          data
        });
      } catch (error) {
        // ignore errors during emit
      }
    };

    const modifierState = (event) => ({
      altKey: !!event.altKey,
      ctrlKey: !!event.ctrlKey,
      metaKey: !!event.metaKey,
      shiftKey: !!event.shiftKey
    });

    const pointerPayload = (event, extra = {}) => {
      const rect = {
        width: window.innerWidth || 1,
        height: window.innerHeight || 1
      };

      const nx = rect.width ? clamp(event.clientX / rect.width, 0, 1) : 0;
      const ny = rect.height ? clamp(event.clientY / rect.height, 0, 1) : 0;

      return Object.assign({
        pointerType: event.pointerType || (event.touches ? 'touch' : 'mouse'),
        pointerId: typeof event.pointerId === 'number' ? event.pointerId : 1,
        button: typeof event.button === 'number' ? event.button : 0,
        buttons: typeof event.buttons === 'number' ? event.buttons : (event.type === 'mouseup' ? 0 : 1),
        detail: typeof event.detail === 'number' ? event.detail : 0,
        clientX: event.clientX || 0,
        clientY: event.clientY || 0,
        pageX: event.pageX || (event.clientX + window.scrollX) || 0,
        pageY: event.pageY || (event.clientY + window.scrollY) || 0,
        screenX: event.screenX || 0,
        screenY: event.screenY || 0,
        nx,
        ny,
        width: event.width || 1,
        height: event.height || 1,
        pressure: typeof event.pressure === 'number' ? event.pressure : 0.5,
        isPrimary: typeof event.isPrimary === 'boolean' ? event.isPrimary : true,
        ...modifierState(event)
      }, extra);
    };

    const wheelPayload = (event) => Object.assign(pointerPayload(event), {
      deltaX: event.deltaX || 0,
      deltaY: event.deltaY || 0,
      deltaMode: event.deltaMode || 0
    });

    const keyPayload = (event) => ({
      key: event.key,
      code: event.code,
      keyCode: event.keyCode,
      repeat: !!event.repeat,
      location: event.location,
      ...modifierState(event)
    });

    const onPointerDown = (event) => {
      send('pointer', Object.assign(pointerPayload(event), { phase: 'down' }));
    };

    const onPointerMove = (event) => {
      send('pointer', Object.assign(pointerPayload(event), { phase: 'move' }));
    };

    const onPointerUp = (event) => {
      send('pointer', Object.assign(pointerPayload(event), { phase: 'up' }));
    };

    const onPointerCancel = (event) => {
      send('pointer', Object.assign(pointerPayload(event), { phase: 'cancel' }));
    };

    const onWheel = (event) => {
      send('wheel', wheelPayload(event));
    };

    const onKeyDown = (event) => {
      send('keyDown', keyPayload(event));
    };

    const onKeyUp = (event) => {
      send('keyUp', keyPayload(event));
    };

    const onInput = (event) => {
      const target = event.composedPath ? event.composedPath()[0] : event.target;
      if (!target || !(target instanceof HTMLElement)) {
        return;
      }

      const selection = (() => {
        if (typeof target.selectionStart === 'number' && typeof target.selectionEnd === 'number') {
          return {
            selectionStart: target.selectionStart,
            selectionEnd: target.selectionEnd
          };
        }
        return null;
      })();

      const payload = {
        value: target.value !== undefined ? target.value : target.innerText,
        selection
      };

      send('insertText', payload);
    };

    const onScroll = () => {
      send('scroll', {
        x: window.scrollX,
        y: window.scrollY
      });
    };

    const onVisibilityChange = () => {
      send('visibility', {
        state: document.visibilityState
      });
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('pointercancel', onPointerCancel, true);
    document.addEventListener('wheel', onWheel, { passive: true, capture: true });
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);
    document.addEventListener('input', onInput, true);
    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('visibilitychange', onVisibilityChange, true);

    send('init', {});
  };

  return `
    (() => {
      const CONFIG = ${serializedConfig};
      (${controllerBundle.toString()})(CONFIG);
    })();
  `;
}

module.exports = createControllerScript;
