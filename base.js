// modo-espelho-touch-canvas-leader-plus.js
// Node 18+
// npm i puppeteer ws

import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import puppeteer from "puppeteer";

/* ================= Perfil móvel fixo (Pixel 7 / Android 14) ================ */
const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const UA_METADATA = {
  brands: [
    { brand: "Chromium", version: "120" },
    { brand: "Google Chrome", version: "120" },
    { brand: "Not=A?Brand", version: "99" },
  ],
  fullVersionList: [
    { brand: "Chromium", version: "120.0.0.0" },
    { brand: "Google Chrome", version: "120.0.0.0" },
    { brand: "Not=A?Brand", version: "99.0.0.0" },
  ],
  platform: "Android",
  platformVersion: "14",
  architecture: "",
  model: "Pixel 7",
  mobile: true,
};
const VIEWPORT = { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, isLandscape: false };
const ACCEPT_LANG = "pt-BR,pt;q=0.9,en;q=0.8";

/* ======================= Helpers mínimos de robustez ======================= */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function stableEval(target, fn, { retries = 2, delay = 120 } = {}) {
  for (let i = 0; i <= retries; i++) {
    try {
      if (typeof target.waitForFunction === "function") {
        await target
          .waitForFunction(() => document.readyState === "interactive" || document.readyState === "complete", { timeout: 3000 })
          .catch(() => {});
      }
      return await fn();
    } catch (err) {
      const m = String(err?.message || err);
      const transient =
        m.includes("Execution context was destroyed") ||
        m.includes("Cannot find context") ||
        m.includes("invalidated") ||
        m.includes("Target closed");
      if (transient && i < retries) { await sleep(delay + i * 120); continue; }
      throw err;
    }
  }
}

/* ================================= CLI ==================================== */
const args = Object.fromEntries(process.argv.slice(2).map(s => { const [k,...rest]=s.replace(/^--/,"").split("="); return [k, rest.length?rest.join("="):true]; }));
const START_URL = typeof args.url === "string" ? args.url : "https://example.org/";
const FOLLOWERS = Number.isFinite(+args.followers) ? Math.max(1,+args.followers) : 2;

/* ============================ WS broker (local) ============================ */
const server = http.createServer();
const wss = new WebSocketServer({ server });
const peers = new Set();
wss.on("connection", (ws) => {
  peers.add(ws);
  ws.on("message", (buf) => { for (const p of peers) if (p !== ws && p.readyState === WebSocket.OPEN) p.send(buf); });
  ws.on("close", () => peers.delete(ws));
});
const PORT = 8080;
server.listen(PORT, () => console.log(`WS broker on :${PORT}`));
const ROOM = "espelho";

/* ========================== Perfil + Emulação Touch ======================== */
async function applyFixedMobileProfile(page) {
  try { await page.setUserAgent(MOBILE_UA); } catch {}
  try { await page.setViewport(VIEWPORT); } catch {}
  try { await page.setExtraHTTPHeaders({ "Accept-Language": ACCEPT_LANG }); } catch {}
  try {
    const c = await page.target().createCDPSession();
    await c.send("Network.setUserAgentOverride", { userAgent: MOBILE_UA, platform: UA_METADATA.platform, userAgentMetadata: UA_METADATA });
    await c.send("Network.setExtraHTTPHeaders", {
      headers: {
        "Sec-CH-UA": `"Chromium";v="120", "Google Chrome";v="120", "Not=A?Brand";v="99"`,
        "Sec-CH-UA-Mobile": "?1",
        "Sec-CH-UA-Platform": `"Android"`,
        "Sec-CH-UA-Platform-Version": `"14"`,
        "Sec-CH-UA-Model": `"Pixel 7"`,
        "Upgrade-Insecure-Requests": "1",
      },
    });
    // Ambiente touch global no líder/seguidores (máx 1 dedo)
    await c.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  } catch {}

  // Sinalização de idioma
  await page.evaluateOnNewDocument((lang) => {
    Object.defineProperty(navigator, "language", { get: () => lang });
    Object.defineProperty(navigator, "languages", { get: () => [lang, "en-US", "en"] });
  }, "pt-BR");

  // Injetar CSS e flags "mobile/touch" como no seu TouchSimulator (sem bloquear cliques)
  await page.evaluateOnNewDocument(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      * { -webkit-tap-highlight-color: rgba(0,0,0,0.08) !important; }
      canvas {
        -webkit-touch-callout: none !important;
        -webkit-user-select: none !important;
        user-select: none !important;
        -webkit-tap-highlight-color: rgba(0,0,0,0) !important;
        touch-action: none !important;
        cursor: default !important;
      }
      button, a, [role="button"], .btn, [onclick],
      .ui-select, .ui-select-single, .dropdown,
      [class*="select"], [class*="dropdown"], [class*="option"] {
        touch-action: manipulation !important;
        -webkit-user-select: none !important;
        user-select: none !important;
        cursor: pointer !important;
      }
      input[type="text"], input[type="email"], input[type="password"],
      input[type="search"], input[type="url"], input[type="tel"], textarea {
        touch-action: auto !important;
        -webkit-user-select: text !important;
        user-select: text !important;
      }
      html, body {
        -webkit-overflow-scrolling: touch !important;
        touch-action: pan-x pan-y !important;
      }
    `;
    document.addEventListener('DOMContentLoaded', () => {
      try { document.head.appendChild(style); } catch {}
    });

    // Touch “capabilities” (compat com libs antigas)
    try {
      Object.defineProperty(window, 'ontouchstart', { value: null, configurable: true });
      Object.defineProperty(window, 'ontouchmove', { value: null, configurable: true });
      Object.defineProperty(window, 'ontouchend', { value: null, configurable: true });
      Object.defineProperty(window, 'ontouchcancel', { value: null, configurable: true });
      Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 1 });
    } catch {}
  });
}

/* ============================ Utils do Líder =============================== */
async function getVV(page) {
  return stableEval(page, () =>
    page.evaluate(() => {
      const v = window.visualViewport; return v ? { w: v.width, h: v.height } : { w: innerWidth, h: innerHeight };
    })
  );
}
async function nxnyToXY(page, nx, ny) {
  const v = await getVV(page);
  return { x: nx * v.w, y: ny * v.h };
}

/* ========== Despacho de TOUCH confiável (CDP) no LÍDER (sem bloquear) ====== */
const leaderClients = new Map();   // Page -> CDP session
const leaderTouchActive = new Map(); // pageId -> bool
const TOUCH_ID = 1;

async function cdps(page) {
  if (!leaderClients.has(page)) leaderClients.set(page, await page.target().createCDPSession());
  return leaderClients.get(page);
}
async function leaderDispatchTouch(page, type, x, y) {
  const c = await cdps(page);
  const points = type === "touchEnd" ? [] : [{ x, y, id: TOUCH_ID, radiusX: 5, radiusY: 5, force: .5 }];
  await c.send("Input.dispatchTouchEvent", { type, touchPoints: points });
}

/* ================================ Líder =================================== */
async function launchLeader(startUrl) {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const ws = new WebSocket(`ws://localhost:${PORT}`);
  await new Promise((res) => ws.on("open", res));

  let pages = await browser.pages();
  if (!pages.length) pages = [await browser.newPage()];
  for (const p of pages) await applyFixedMobileProfile(p);
  if (pages[0].url() === "about:blank") await pages[0].goto(startUrl, { waitUntil: "domcontentloaded" });

  const pageIdOf = new Map(); const byId = new Map();
  const renumber = async () => {
    const list = await browser.pages();
    list.forEach((p,i)=>{ pageIdOf.set(p,i); byId.set(i,p); });
    return list.map(p => ({ id: pageIdOf.get(p), url: p.url() }));
  };

  // expõe para o frame pedir touch local (sem bloquear mouse/pointer)
  async function ensureInjected(page, pageId) {
    await page.exposeFunction("mirrorEmit", (payload) => {
      ws.send(JSON.stringify({ ...payload, role: "leader", room: ROOM, pageId }));
    });
    await page.exposeFunction("mirrorLocal", async (payload) => {
      try {
        const { nx, ny, type } = payload || {};
        if (typeof nx !== "number" || typeof ny !== "number" || !type) return;
        const { x, y } = await nxnyToXY(page, nx, ny);
        if (type === "touchStart") {
          leaderTouchActive.set(pageId, true);
          await leaderDispatchTouch(page, "touchStart", x, y);
        } else if (type === "touchMove") {
          if (!leaderTouchActive.get(pageId)) {
            leaderTouchActive.set(pageId, true);
            await leaderDispatchTouch(page, "touchStart", x, y);
          }
          await leaderDispatchTouch(page, "touchMove", x, y);
        } else if (type === "touchEnd") {
          if (!leaderTouchActive.get(pageId)) return;
          await leaderDispatchTouch(page, "touchEnd", x, y);
          leaderTouchActive.set(pageId, false);
        }
      } catch {}
    });

    const injectFrame = async (frame) => {
      try {
        await stableEval(frame, () => frame.evaluate(() => {
          if (window.__mirrorTabsInjected_vCanvasLeader_v2) return;
          window.__mirrorTabsInjected_vCanvasLeader_v2 = true;

          const send = (type, data = {}) => {
            const vv = window.visualViewport;
            // @ts-ignore
            window.mirrorEmit({
              type, ts: performance.now(),
              vv: vv ? { w: vv.width, h: vv.height, scale: vv.scale, pageLeft: vv.pageLeft, pageTop: vv.pageTop, offsetLeft: vv.offsetLeft, offsetTop: vv.offsetTop } : null,
              scroll: { x: window.scrollX, y: window.scrollY },
              ...data
            });
          };

          const toTopClient = (clientX, clientY) => {
            let x = clientX, y = clientY;
            if (window.visualViewport) { x += window.visualViewport.offsetLeft; y += window.visualViewport.offsetTop; }
            let w = window;
            while (w !== w.top) {
              const r = w.frameElement.getBoundingClientRect();
              x += r.left; y += r.top;
              w = w.parent;
              if (w.visualViewport) { x += w.visualViewport.offsetLeft; y += w.visualViewport.offsetTop; }
            }
            return { x, y };
          };
          const normalizeTop = (x,y) => { const v = window.top.visualViewport; return { nx:x/v.width, ny:y/v.height }; };
          const isCanvasAtLocal = (clientX, clientY) => {
            try {
              const el = document.elementFromPoint(clientX, clientY);
              return el && el.tagName && el.tagName.toLowerCase() === "canvas";
            } catch { return false; }
          };
          const buttonMask = (e) => e.buttons ?? 0;
          const whichButton = (e) => e.button ?? 0;

          let __lastNorm = { nx: .5, ny: .5 }, __lastIsCanvas = false;

          const onMove = (e) => {
            const { x, y } = toTopClient(e.clientX, e.clientY);
            const { nx, ny } = normalizeTop(x, y);
            __lastNorm = { nx, ny };
            const isCanvas = isCanvasAtLocal(e.clientX, e.clientY) === true;
            __lastIsCanvas = isCanvas;

            // NÃO bloqueia mouse/pointer; apenas adiciona toque local quando arrastando em canvas
            if (isCanvas && (e.buttons & 1)) {
              // @ts-ignore
              window.mirrorLocal({ type: "touchMove", nx, ny });
            }

            send("mousemove", { nx, ny, btns: buttonMask(e), isCanvas });
          };
          const throttledMove = (()=>{ let last=0; return (e)=>{ const n=performance.now(); if (n-last>16){ last=n; onMove(e); } }; })();

          const emitMouse = (type) => (e) => {
            const { x, y } = toTopClient(e.clientX, e.clientY);
            const { nx, ny } = normalizeTop(x, y);
            __lastNorm = { nx, ny };
            const isCanvas = isCanvasAtLocal(e.clientX, e.clientY) === true;
            __lastIsCanvas = isCanvas;

            // Importante: NÃO fazemos preventDefault aqui — deixamos mouse/pointer acontecer
            // e adicionamos o "toque confiável" via CDP em paralelo quando alvo for canvas.
            if (isCanvas) {
              if (type === "mousedown") {
                // @ts-ignore
                window.mirrorLocal({ type: "touchStart", nx, ny });
              } else if (type === "mouseup") {
                // @ts-ignore
                window.mirrorLocal({ type: "touchEnd", nx, ny });
              }
            }

            send(type, { nx, ny, button: whichButton(e), btns: buttonMask(e), detail: e.detail ?? 1, isCanvas });
          };

          const firstTouch = (list) => { if (!list || !list.length) return null; const t=list[0]; return { clientX:t.clientX, clientY:t.clientY }; };
          const emitTouch = (type) => (e) => {
            const t = firstTouch(e.touches.length ? e.touches : e.changedTouches);
            if (!t) return;
            const { x, y } = toTopClient(t.clientX, t.clientY);
            const { nx, ny } = normalizeTop(x, y);
            __lastNorm = { nx, ny };
            send(type, { nx, ny, isCanvas: true });
          };

          const onWheel = (e) => {
            const isCanvas = isCanvasAtLocal(e.clientX, e.clientY) || __lastIsCanvas;
            send("wheel", { deltaX: e.deltaX, deltaY: e.deltaY, isCanvas: !!isCanvas });
          };
          const onScroll = () => send("scrollTo", { toX: window.scrollX, toY: window.scrollY });

          const mods = (e) => ({ altKey: !!e.altKey, ctrlKey: !!e.ctrlKey, metaKey: !!e.metaKey, shiftKey: !!e.shiftKey });
          window.addEventListener("keydown", (e)=>{ /* @ts-ignore */ window.mirrorEmit({type:"keyDown", key:e.key, code:e.code, repeat:e.repeat, ...mods(e), focusHint: __lastNorm}); }, true);
          window.addEventListener("keyup",   (e)=>{ /* @ts-ignore */ window.mirrorEmit({type:"keyUp", key:e.key, code:e.code, ...mods(e), focusHint: __lastNorm}); }, true);
          window.addEventListener("beforeinput",(e)=>{ if(typeof e.data==="string"&&e.data.length>0){ /* @ts-ignore */ window.mirrorEmit({type:"insertText", text:e.data, inputType:e.inputType, focusHint: __lastNorm}); }}, true);
          window.addEventListener("compositionend",(e)=>{ if(e.data){ /* @ts-ignore */ window.mirrorEmit({type:"insertText", text:e.data, ime:true, focusHint: __lastNorm}); }}, true);

          const vis = ()=>{ if (document.visibilityState==="visible") { /* @ts-ignore */ window.mirrorEmit({ type:"switchTabVisible" }); } };
          document.addEventListener("visibilitychange", vis, true);

          window.addEventListener("mousemove", throttledMove, { capture:true });
          window.addEventListener("mousedown", emitMouse("mousedown"), { capture:true });
          window.addEventListener("mouseup",   emitMouse("mouseup"),   { capture:true });
          window.addEventListener("click",     emitMouse("click"),     { capture:true });
          window.addEventListener("dblclick",  emitMouse("dblclick"),  { capture:true });
          window.addEventListener("contextmenu", emitMouse("contextmenu"), { capture:true });

          window.addEventListener("touchstart", emitTouch("touchStart"), { passive:true, capture:true });
          window.addEventListener("touchmove",  emitTouch("touchMove"),  { passive:true, capture:true });
          window.addEventListener("touchend",   emitTouch("touchEnd"),   { passive:true, capture:true });
          window.addEventListener("touchcancel",emitTouch("touchEnd"),   { passive:true, capture:true });

          window.addEventListener("wheel", onWheel, { passive:true, capture:true });
          window.addEventListener("scroll", onScroll, { passive:true, capture:true });
        }));
      } catch {}
    };

    for (const f of page.frames()) await injectFrame(f);
    page.on("framenavigated", injectFrame);
    page.on("frameattached", injectFrame);
    page.on("load", async () => { for (const f of page.frames()) await injectFrame(f); });

    // reset estado de toque local em navegação do topo
    page.on("framenavigated", (frame) => { if (!frame.parentFrame()) leaderTouchActive.set(pageId, false); });
  }

  const snapshot = await renumber();
  for (const p of await browser.pages()) await ensureInjected(p, pageIdOf.get(p));
  ws.send(JSON.stringify({ role:"leader", room:ROOM, type:"initTabs", tabs:snapshot, active: await activeIndex(browser) }));

  browser.on("targetcreated", async (t) => {
    if (t.type() !== "page") return;
    const p = await t.page();
    await applyFixedMobileProfile(p);
    await sleep(50);
    await renumber();
    const id = pageIdOf.get(p);
    await ensureInjected(p, id);
    ws.send(JSON.stringify({ role:"leader", room:ROOM, type:"newTab", id, url:p.url() }));
  });
  browser.on("targetdestroyed", async (t) => {
    if (t.type() !== "page") return;
    const tabs = await renumber();
    ws.send(JSON.stringify({ role:"leader", room:ROOM, type:"closeTab", tabs, active: await activeIndex(browser) }));
  });
  for (const p of await browser.pages()) {
    p.on("framenavigated", (frame) => {
      if (frame.parentFrame()) return;
      ws.send(JSON.stringify({ role:"leader", room:ROOM, type:"tabNavigated", id: pageIdOf.get(p), url: p.url() }));
    });
  }
}

async function activeIndex(browser) {
  const pages = await browser.pages();
  for (const [i, p] of pages.entries()) {
    try { if (await p.evaluate(() => document.visibilityState === "visible")) return i; } catch {}
  }
  return 0;
}

/* =============================== Seguidor ================================ */
async function launchFollower(startUrl, index = 0) {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const ws = new WebSocket(`ws://localhost:${PORT}`);
  await new Promise((res) => ws.on("open", res));

  let pageById = new Map(); let activeId = 0;

  let pages = await browser.pages();
  if (!pages.length) pages = [await browser.newPage()];
  for (const p of pages) await applyFixedMobileProfile(p);
  if (pages[0].url() === "about:blank") await pages[0].goto(startUrl, { waitUntil: "domcontentloaded" });
  pageById.set(0, pages[0]);

  const clients = new Map();
  const getClient = async (page) => { if (!clients.has(page)) clients.set(page, await page.target().createCDPSession()); return clients.get(page); };

  const getVV = (page) => stableEval(page, () => page.evaluate(() => {
    const v = window.visualViewport; return v ? { w: v.width, h: v.height } : { w: innerWidth, h: innerHeight };
  }));
  const toSeg = async (page, nx, ny) => { const v = await getVV(page); return { x: nx * v.w, y: ny * v.h }; };
  const ensureScroll = (page,x,y) => stableEval(page, () => page.evaluate((x,y)=>window.scrollTo(x,y), x,y));

  const mapButton = (b) => (b === 1 ? "middle" : b === 2 ? "right" : "left");
  const toModifiers = ({ altKey, ctrlKey, metaKey, shiftKey }) => (altKey?1:0)|(ctrlKey?2:0)|(metaKey?4:0)|(shiftKey?8:0);
  const isControlKey = (key) => new Set(["Enter","Backspace","Tab","Escape","Delete","ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End","PageUp","PageDown","Insert","F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12"]).has(key);

  const lastMove = new Map();     // id -> {x,y}
  const lastCanvas = new Map();   // id -> boolean
  const touchActive = new Map();  // id -> boolean
  const touchId = 1;

  async function dispatchMouse(page, type, x, y, opts={}) {
    try { const c = await getClient(page);
      await c.send("Input.dispatchMouseEvent", { type, x, y, button: mapButton(opts.button), buttons: opts.btns ?? 0, clickCount: opts.detail ?? 1 });
    } catch (e) { const m=String(e?.message||e); if (m.includes("Target closed")) return; throw e; }
  }
  async function dispatchTouch(page, type, x, y) {
    try { const c = await getClient(page);
      const points = type === "touchEnd" ? [] : [{ x, y, id: touchId, radiusX: 5, radiusY: 5, force: .5 }];
      await c.send("Input.dispatchTouchEvent", { type, touchPoints: points });
    } catch (e) { const m=String(e?.message||e); if (m.includes("Target closed")) return; throw e; }
  }
  async function synthScroll(page, x, y, dx, dy) {
    try { const c = await getClient(page);
      await c.send("Input.synthesizeScrollGesture", { x, y, xDistance: dx||0, yDistance: dy||0, speed: 800, gestureSourceType: "touch" });
    } catch (e) { const m=String(e?.message||e); if (m.includes("Target closed")) return; throw e; }
  }

  async function ensureFocus(page, pageId, hint) {
    let needs = true;
    try { needs = await stableEval(page, () =>
      page.evaluate(() => {
        const ae = document.activeElement;
        return !ae || ae === document.body || (ae.tabIndex === -1 && !ae.isContentEditable);
      })
    ); } catch {}
    if (needs) {
      const v = await getVV(page).catch(()=>({ w:100, h:100 }));
      const x = hint?.nx!=null ? hint.nx * v.w : (lastMove.get(pageId)?.x ?? v.w/2);
      const y = hint?.ny!=null ? hint.ny * v.h : (lastMove.get(pageId)?.y ?? v.h/2);
      await dispatchMouse(page, "mousePressed", x, y, { button: 0, btns: 1 });
      await dispatchMouse(page, "mouseReleased", x, y, { button: 0, btns: 0 });
    }
  }

  ws.on("message", async (buf) => {
    const msg = JSON.parse(buf.toString());
    if (msg.room !== ROOM || msg.role !== "leader") return;

    /* -------- abas -------- */
    if (msg.type === "initTabs") {
      const curr = await browser.pages();
      for (let i = curr.length - 1; i >= msg.tabs.length; i--) await curr[i].close().catch(()=>{});
      const need = msg.tabs.length - curr.length;
      for (let i = 0; i < need; i++) { const p = await browser.newPage(); await applyFixedMobileProfile(p); curr.push(p); }
      pageById = new Map();
      for (let i = 0; i < msg.tabs.length; i++) {
        const p = curr[i]; pageById.set(i, p);
        if (p.url() !== msg.tabs[i].url) { try { await p.goto(msg.tabs[i].url, { waitUntil: "domcontentloaded" }); } catch {} }
      }
      activeId = Number.isFinite(+msg.active) ? +msg.active : 0;
      await pageById.get(activeId)?.bringToFront().catch(()=>{});
      touchActive.clear(); lastCanvas.clear();
      return;
    }
    if (msg.type === "newTab") {
      const p = await browser.newPage(); await applyFixedMobileProfile(p);
      if (msg.url) { try { await p.goto(msg.url, { waitUntil: "domcontentloaded" }); } catch {} }
      pageById.set(msg.id, p);
      return;
    }
    if (msg.type === "closeTab") {
      const keep = new Set(msg.tabs.map(t=>t.id));
      for (const [id,p] of pageById.entries()) if (!keep.has(id)) { await p.close().catch(()=>{}); pageById.delete(id); }
      activeId = Number.isFinite(+msg.active) ? +msg.active : [...pageById.keys()][0] ?? 0;
      await pageById.get(activeId)?.bringToFront().catch(()=>{});
      return;
    }
    if (msg.type === "switchTabVisible") {
      const want = Number.isFinite(+msg.pageId) ? +msg.pageId : 0;
      if (pageById.has(want)) { activeId = want; await pageById.get(activeId)?.bringToFront().catch(()=>{}); }
      return;
    }
    if (msg.type === "tabNavigated") {
      const p = pageById.get(msg.id);
      if (p && msg.url && p.url() !== msg.url) { try { await p.goto(msg.url, { waitUntil: "domcontentloaded" }); } catch {} }
      touchActive.set(msg.id, false); lastCanvas.set(msg.id, false);
      return;
    }

    /* -------- eventos -------- */
    const pageId = Number.isFinite(+msg.pageId) ? +msg.pageId : activeId;
    const page = pageById.get(pageId) || pageById.get(activeId);
    if (!page) return;

    const useTouch = (fallback=false) => {
      if (typeof msg.isCanvas === "boolean") return msg.isCanvas;
      if (fallback) return !!lastCanvas.get(pageId);
      return false;
    };

    switch (msg.type) {
      case "scrollTo": {
        await ensureScroll(page, msg.toX, msg.toY);
        break;
      }

      case "mousemove": {
        const { x, y } = await toSeg(page, msg.nx, msg.ny);
        lastMove.set(pageId, { x, y });
        if (useTouch(true) && touchActive.get(pageId)) {
          await dispatchTouch(page, "touchMove", x, y);
        } else {
          await dispatchMouse(page, "mouseMoved", x, y, { btns: msg.btns });
        }
        if (typeof msg.isCanvas === "boolean") lastCanvas.set(pageId, !!msg.isCanvas);
        break;
      }

      case "mousedown": {
        const { x, y } = await toSeg(page, msg.nx, msg.ny);
        lastMove.set(pageId, { x, y });
        const canvas = useTouch(); lastCanvas.set(pageId, canvas);
        if (canvas) { touchActive.set(pageId, true); await dispatchTouch(page, "touchStart", x, y); }
        else { await dispatchMouse(page, "mousePressed", x, y, { button: msg.button, btns: msg.btns, detail: msg.detail }); }
        break;
      }

      case "mouseup": {
        const pos = lastMove.get(pageId) || await toSeg(page, msg.nx, msg.ny);
        const canvas = useTouch(true);
        if (canvas && touchActive.get(pageId)) { await dispatchTouch(page, "touchEnd", pos.x, pos.y); touchActive.set(pageId, false); }
        else { await dispatchMouse(page, "mouseReleased", pos.x, pos.y, { button: msg.button, btns: msg.btns, detail: msg.detail }); }
        break;
      }

      case "click":
      case "dblclick":
      case "contextmenu": {
        const { x, y } = await toSeg(page, msg.nx, msg.ny);
        const canvas = useTouch();
        if (!canvas) {
          const clicks = msg.type === "dblclick" ? 2 : 1;
          await dispatchMouse(page, "mousePressed", x, y, { button: msg.button, btns: msg.btns, detail: clicks });
          await dispatchMouse(page, "mouseReleased", x, y, { button: msg.button, btns: msg.btns, detail: clicks });
          if (msg.type === "contextmenu") {
            await dispatchMouse(page, "mousePressed", x, y, { button: 2 });
            await dispatchMouse(page, "mouseReleased", x, y, { button: 2 });
          }
        }
        break;
      }

      case "wheel": {
        const pos = lastMove.get(pageId) || { x: 10, y: 10 };
        if (useTouch(true)) { await synthScroll(page, pos.x, pos.y, msg.deltaX, msg.deltaY); }
        else {
          try { const c = await getClient(page);
            await c.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: pos.x, y: pos.y, deltaX: msg.deltaX || 0, deltaY: msg.deltaY || 0 });
          } catch (e) { const m=String(e?.message||e); if (!m.includes("Target closed")) throw e; }
        }
        break;
      }

      case "touchStart":
      case "touchMove":
      case "touchEnd": {
        const { x, y } = await toSeg(page, msg.nx, msg.ny);
        lastMove.set(pageId, { x, y }); lastCanvas.set(pageId, true);
        if (msg.type === "touchStart") { touchActive.set(pageId, true); await dispatchTouch(page, "touchStart", x, y); }
        else if (msg.type === "touchMove") { if (!touchActive.get(pageId)) { touchActive.set(pageId, true); await dispatchTouch(page, "touchStart", x, y); } await dispatchTouch(page, "touchMove", x, y); }
        else { if (!touchActive.get(pageId)) break; await dispatchTouch(page, "touchEnd", x, y); touchActive.set(pageId, false); }
        break;
      }

      case "keyDown":
      case "keyUp": {
        await ensureFocus(page, pageId, msg.focusHint);
        try { const c = await page.target().createCDPSession();
          await c.send("Input.dispatchKeyEvent", { type: msg.type === "keyDown" ? "keyDown" : "keyUp", key: msg.key, code: msg.code, isAutoRepeat: !!msg.repeat, modifiers: toModifiers(msg) });
        } catch (e) { const m=String(e?.message||e); if (!m.includes("Target closed")) throw e; }
        break;
      }

      case "insertText": {
        await ensureFocus(page, pageId, msg.focusHint);
        if (typeof msg.text === "string" && msg.text.length>0) {
          try { const c = await page.target().createCDPSession(); await c.send("Input.insertText", { text: msg.text }); }
          catch (e) { const m=String(e?.message||e); if (!m.includes("Target closed")) throw e; }
        }
        break;
      }
    }
  });

  console.log(`[Follower ${index}] pronto (touch somente em canvas)`);
}

/* ================================= Boot =================================== */
(async () => {
  launchLeader(START_URL);
  await sleep(500);
  for (let i = 0; i < FOLLOWERS; i++) { await sleep(200); launchFollower(START_URL, i + 1); }
  console.log(`Leader + ${FOLLOWERS} follower(s) prontos. URL base: ${START_URL}\nPerfil móvel: Pixel 7 / Android 14 / Chrome 120`);
})();
