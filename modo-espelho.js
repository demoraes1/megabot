const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const targetIdToPageMap = new Map();
let typingPromise = Promise.resolve();
let scrollPromise = Promise.resolve();
let keyPressPromise = Promise.resolve();
const pageToLastValuesMap = new Map();

// --- FUNÇÃO DE INJEÇÃO (VERSÃO HÍBRIDA) ---
async function injectListeners(page) {
    return page.evaluate(() => {
        if (window.listenersInjected) return;
        window.listenersInjected = true;

        const getCssSelector = (el) => {
            if (!(el instanceof Element)) return 'body';
            const path = [];
            while (el.nodeType === Node.ELEMENT_NODE) {
                let selector = el.nodeName.toLowerCase();
                if (el.id) { selector += '#' + el.id; path.unshift(selector); break; }
                else { let sib = el, nth = 1; while (sib = sib.previousElementSibling) { if (sib.nodeName.toLowerCase() == selector) nth++; } if (nth != 1) selector += `:nth-of-type(${nth})`; }
                path.unshift(selector); el = el.parentNode;
            }
            return path.join(' > ');
        };

        // Lógica Híbrida para cliques e toques
        const handleInteraction = (event) => {
            const target = event.target;
            const coords = event.touches ? event.touches[0] : event;

            // Se o alvo for o fundo da página, usa fallback de coordenada
            if (target.nodeName === 'BODY' || target.nodeName === 'HTML') {
                window.replicateTapByCoords(coords.clientX, coords.clientY);
            } else {
                // Senão, usa o método de seletor (preferencial)
                window.replicateClickInNode(getCssSelector(target));
            }
        };

        document.addEventListener('click', handleInteraction, true);
        document.addEventListener('touchstart', handleInteraction, true);

        // Funções de digitação, scroll e teclas permanecem
        document.addEventListener('input', e => window.replicateTypingInNode(getCssSelector(e.target), e.target.value), true);
        document.addEventListener('keydown', event => { const actionKeys = ['Enter', 'Tab']; if (actionKeys.includes(event.key)) { event.preventDefault(); const selector = getCssSelector(document.activeElement); window.replicateKeyPressInNode(selector, event.key, event.shiftKey); } }, true);
        document.addEventListener('scroll', event => { const target = event.target; let scrollTop, scrollLeft, selector; if (target === document || target === document.documentElement || target === document.body) { selector = 'window'; scrollTop = window.scrollY; scrollLeft = window.scrollX; } else { selector = getCssSelector(target); scrollTop = target.scrollTop; scrollLeft = target.scrollLeft; } window.replicateScrollInNode(selector, scrollTop, scrollLeft); }, true);
    });
}

// --- FUNÇÃO DE ESPELHAMENTO (VERSÃO HÍBRIDA) ---
async function setupPageMirroring(page1, page2) {
    console.log(`Configurando espelhamento para a página: ${page1.url()}`);
    
    // Expõe AMBAS as funções: por seletor e por coordenada (fallback)
    await page1.exposeFunction('replicateClickInNode', async (selector) => {
        try {
            await page2.click(selector);
            console.log(`Clique replicado no seletor: ${selector}`);
        } catch (e) { console.error("Falha ao replicar clique por seletor."); }
    });

    await page1.exposeFunction('replicateTapByCoords', async (x, y) => {
        try {
            await page2.touchscreen.tap(x, y);
            console.log(`Toque de fallback replicado em [${x}, ${y}]`);
        } catch (e) { console.error("Falha ao replicar o toque por coordenada."); }
    });

    // ... (demais funções expostas permanecem as mesmas) ...
    pageToLastValuesMap.set(page1, new Map()); const lastKnownValues = pageToLastValuesMap.get(page1);
    await page1.exposeFunction('replicateTypingInNode', (selector, newValue) => { typingPromise = typingPromise.then(async () => { try { const oldValue = lastKnownValues.get(selector) || ''; await page2.focus(selector); if (newValue.length > oldValue.length && newValue.startsWith(oldValue)) { const textToAdd = newValue.slice(oldValue.length); await page2.keyboard.type(textToAdd); } else if (oldValue.length > newValue.length && oldValue.startsWith(newValue)) { const charsToRemove = oldValue.length - newValue.length; for (let i = 0; i < charsToRemove; i++) await page2.keyboard.press('Backspace'); } else { await page2.evaluate((sel) => { document.querySelector(sel).value = "" }, selector); if (newValue) await page2.type(selector, newValue); } lastKnownValues.set(selector, newValue); } catch (e) { console.error("Falha ao replicar digitação."); lastKnownValues.delete(selector); } }); });
    await page1.exposeFunction('replicateKeyPressInNode', (selector, key, shiftKey) => { keyPressPromise = keyPressPromise.then(async () => { try { await page2.focus(selector); if (shiftKey) await page2.keyboard.down('Shift'); await page2.keyboard.press(key); if (shiftKey) await page2.keyboard.up('Shift'); } catch (e) { console.error(`Falha ao replicar tecla "${key}".`); } }); });
    await page1.exposeFunction('replicateScrollInNode', (selector, scrollTop, scrollLeft) => { scrollPromise = scrollPromise.then(async () => { try { if (selector === 'window') { await page2.evaluate((top, left) => { window.scrollTo(left, top); }, scrollTop, scrollLeft); } else { await page2.$eval(selector, (el, top, left) => { el.scrollTop = top; el.scrollLeft = left; }, scrollTop, scrollLeft); } } catch (e) { /* Ignorar erros de rolagem */ } }); });
    page1.on('domcontentloaded', async () => { await injectListeners(page1); });
    page1.on('framenavigated', async (frame) => { if (frame === page1.mainFrame()) { const url1 = frame.url(); const url2 = page2.url(); if (url1 !== url2 && url1 !== 'about:blank') { console.log(`Navegação detectada para: ${url1}. Sincronizando aba espelho...`); await page2.goto(url1, { waitUntil: 'domcontentloaded' }).catch(e => console.error("Falha ao sincronizar navegação:", e.message)); } } });
    if (page1.url() !== 'about:blank') { await injectListeners(page1); }
}


(async () => {
    const iPhone13 = { name: 'iPhone 13', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1', viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true, isLandscape: false, }, };
    console.log('Iniciando navegador de controle (esquerda)...');
    const browser1 = await puppeteer.launch({ headless: false, args: ['--window-position=0,0', '--proxy-server=http://proxy.tourosnet.com.br:5900'] });
    console.log('Iniciando navegador espelho (direita)...');
    const browser2 = await puppeteer.launch({ headless: false, args: [`--window-position=${iPhone13.viewport.width},0`, '--proxy-server=http://proxy.tourosnet.com.br:5900'] });
    const [initialPage1] = await browser1.pages();
    const [initialPage2] = await browser2.pages();
    await initialPage1.emulate(iPhone13);
    await initialPage2.emulate(iPhone13);
    const initialTargetId = initialPage1.target()._targetId;
    targetIdToPageMap.set(initialTargetId, initialPage2);
    await setupPageMirroring(initialPage1, initialPage2);
    browser1.on('targetcreated', async (target) => { if (target.type() === 'page') { const newPage1 = await target.page(); if (!newPage1) return; console.log('Nova aba detectada no navegador 1. Replicando...'); const newPage2 = await browser2.newPage(); await newPage1.emulate(iPhone13); await newPage2.emulate(iPhone13); targetIdToPageMap.set(target._targetId, newPage2); await setupPageMirroring(newPage1, newPage2); } });
    browser1.on('targetdestroyed', async (target) => { if (targetIdToPageMap.has(target._targetId)) { console.log('Aba fechada no navegador 1. Fechando a aba espelho...'); const pageToClose = targetIdToPageMap.get(target._targetId); if (pageToClose && !pageToClose.isClosed()) { await pageToClose.close(); } targetIdToPageMap.delete(target._targetId); } });
    const targetUrl = 'https://www.meuip.com.br/';
    await initialPage1.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    console.log("Alternativa 2 (Híbrida com Fallback) ativada. Interaja com o navegador da esquerda.");
})();