import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

const CONFIG_FILE = 'config.txt';

async function getBrowserConfigs() {
    try {
        const filePath = path.resolve(process.cwd(), CONFIG_FILE);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        
        return fileContent
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))
            .map((line, index) => {
                const parts = line.split(',').map(Number);
                if (parts.length !== 5 || parts.some(isNaN)) {
                    console.warn(`[Aviso] Linha ${index + 1} inválida no config.txt: "${line}"`);
                    return null;
                }
                const [left, top, width, height, scale] = parts;
                return { left, top, width, height, scale, id: index + 1 };
            })
            .filter(Boolean);
    } catch (error) {
        console.error(`[Erro] Não foi possível ler o arquivo de configuração "${CONFIG_FILE}".`);
        console.error('Certifique-se de que o arquivo existe na mesma pasta do script.');
        process.exit(1);
    }
}

async function launchAndPositionBrowser(config) {
    console.log(`Lançando Navegador #${config.id} com zoom de ${config.scale * 100}%...`);
    
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            `--window-size=${config.width},${config.height}`
        ]
    });

    let cdpSession;
    try {
        const page = (await browser.pages())[0] || await browser.newPage();
        
        // Define o tamanho do viewport, mas mantém a escala do dispositivo padrão (1)
        await page.setViewport({
            width: config.width,
            height: config.height,
            deviceScaleFactor: 1 
        });
        
        cdpSession = await page.target().createCDPSession();

        // Posiciona a janela fisicamente na tela
        const { windowId } = await cdpSession.send('Browser.getWindowForTarget');
        await cdpSession.send('Browser.setWindowBounds', {
            windowId,
            bounds: { 
                left: config.left, 
                top: config.top, 
                width: config.width, 
                height: config.height 
            }
        });
        
        // --- INÍCIO DA MUDANÇA ---
        // Aplica o ZOOM VISUAL na página usando o CDP
        // Isto é equivalente a pressionar Ctrl +/-
        await cdpSession.send('Emulation.setPageScaleFactor', {
            pageScaleFactor: config.scale
        });
        // --- FIM DA MUDANÇA ---
        
        const title = `Navegador #${config.id} | ${config.width}x${config.height} @ ${config.scale*100}% Zoom`;
        await page.goto(`data:text/html,<h1>${title}</h1><title>${title}</title>`);
        
        console.log(`Navegador #${config.id} posicionado e com zoom aplicado.`);

    } catch (err) {
        console.error(`[Erro] Falha ao configurar o navegador #${config.id}:`, err);
        await browser.close();
    } finally {
        if (cdpSession) {
            await cdpSession.detach();
        }
    }
}

// --- Função Principal ---
(async () => {
    const configs = await getBrowserConfigs();

    if (configs.length === 0) {
        console.log('Nenhuma configuração válida encontrada em "config.txt". Encerrando.');
        return;
    }
    
    console.log(`Encontradas ${configs.length} configurações. Lançando navegadores...`);
    
    await Promise.all(configs.map(launchAndPositionBrowser));

    console.log('\nTodos os navegadores foram lançados!');
    console.log('Pressione Ctrl+C no terminal para fechar tudo.');
})();