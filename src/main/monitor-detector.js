const si = require('systeminformation');
const fs = require('fs');
const path = require('path');

/**
 * Detecta automaticamente os monitores conectados ao sistema
 * @returns {Promise<Object>} Informações dos monitores detectados
 */
async function detectarMonitores() {
    try {
        console.log('Detectando monitores com systeminformation...');
        const graphicsInfo = await si.graphics();
        const displaysRaw = graphicsInfo.displays;
        
        if (!displaysRaw || displaysRaw.length === 0) {
            console.log('Nenhum monitor detectado.');
            return {
                success: false,
                error: 'Nenhum monitor detectado',
                monitores: []
            };
        }
        
        const displays = displaysRaw.map((display, index) => ({
            id: index + 1,
            bounds: { 
                x: display.positionX || 0, 
                y: display.positionY || 0, 
                width: display.resolutionX, 
                height: display.resolutionY 
            },
            isPrimary: display.main,
            model: display.model || `Monitor ${index + 1}`,
            vendor: display.vendor || 'Desconhecido'
        }));
        
        console.log(`\n--- RELATÓRIO DE DETECÇÃO DE MONITORES ---`);
        console.log(`Detectado: ${displays.length} monitor(es).`);
        displays.forEach((display) => {
            console.log(`\n  Monitor #${display.id}`);
            console.log(`    É Primário?: ${display.isPrimary ? 'Sim' : 'Não'}`);
            console.log(`    Resolução: ${display.bounds.width}x${display.bounds.height}`);
            console.log(`    Posição: x: ${display.bounds.x}, y: ${display.bounds.y}`);
            console.log(`    Modelo: ${display.model}`);
            console.log(`    Fabricante: ${display.vendor}`);
        });
        console.log("------------------------------------------\n");
        
        // Calcula área total dos monitores
        let minX = Math.min(...displays.map(d => d.bounds.x));
        let minY = Math.min(...displays.map(d => d.bounds.y));
        let maxX = Math.max(...displays.map(d => d.bounds.x + d.bounds.width));
        let maxY = Math.max(...displays.map(d => d.bounds.y + d.bounds.height));
        
        const infoMonitores = {
            areaTotal: { 
                x: minX, 
                y: minY, 
                largura: maxX - minX, 
                altura: maxY - minY 
            },
            quantidade: displays.length,
            detalhes: displays.map(display => ({
                id: display.id,
                nome: display.model,
                fabricante: display.vendor,
                resolucao: `${display.bounds.width}x${display.bounds.height}`,
                posicao: `x: ${display.bounds.x}, y: ${display.bounds.y}`,
                ehPrimario: display.isPrimary,
                bounds: display.bounds
            }))
        };
        
        return {
            success: true,
            monitores: infoMonitores
        };
        
    } catch (error) {
        console.error('Erro ao detectar monitores:', error);
        return {
            success: false,
            error: error.message,
            monitores: []
        };
    }
}

/**
 * Calcula a capacidade de navegadores para um monitor específico
 * @param {Object} bounds - Bounds do monitor (x, y, width, height) ou objeto monitor com bounds
 * @param {number} larguraLogica - Largura lógica do navegador
 * @param {number} alturaLogica - Altura lógica do navegador
 * @param {number} fatorEscala - Fator de escala
 * @returns {Object} Capacidade e posições disponíveis
 */
function calcularCapacidadeMonitor(bounds, larguraLogica = 502, alturaLogica = 800, fatorEscala = 0.65) {
    // Verificar se bounds é um objeto monitor com propriedade bounds ou se já são os bounds diretos
    const monitorBounds = bounds.bounds || bounds;
    
    if (!monitorBounds || typeof monitorBounds.x === 'undefined' || typeof monitorBounds.y === 'undefined') {
        throw new Error('Bounds do monitor inválidos');
    }
    
    const LARGURA_FISICA = Math.round(larguraLogica * fatorEscala);
    const ALTURA_FISICA = Math.round(alturaLogica * fatorEscala);
    
    const mapaNavegadores = [];
    let navegadoresMapeados = 0;
    
    let cursorY = monitorBounds.y;
    while (cursorY + ALTURA_FISICA <= monitorBounds.y + monitorBounds.height) {
        let cursorX = monitorBounds.x;
        while (cursorX + LARGURA_FISICA <= monitorBounds.x + monitorBounds.width) {
            mapaNavegadores.push({ 
                id: navegadoresMapeados, 
                x: cursorX, 
                y: cursorY 
            });
            navegadoresMapeados++;
            cursorX += LARGURA_FISICA;
        }
        cursorY += ALTURA_FISICA;
    }
    
    return {
        capacidade: mapaNavegadores.length,
        posicoes: mapaNavegadores,
        dimensoesFisicas: {
            largura: LARGURA_FISICA,
            altura: ALTURA_FISICA
        }
    };
}

/**
 * Salva os dados dos monitores e posicionamento em arquivo JSON
 * @param {Object} monitoresData - Dados dos monitores detectados
 * @param {Object} posicionamentoData - Dados de posicionamento dos navegadores
 */
function salvarDadosMonitores(monitoresData, posicionamentoData) {
    try {
        const configDir = path.join(__dirname, '..', 'config');
        const filePath = path.join(configDir, 'monitores-config.json');
        
        // Garantir que o diretório existe
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        const dadosCompletos = {
            timestamp: new Date().toISOString(),
            monitores: monitoresData,
            posicionamento: posicionamentoData
        };
        
        fs.writeFileSync(filePath, JSON.stringify(dadosCompletos, null, 2), 'utf8');
        console.log(`Dados dos monitores salvos em: ${filePath}`);
        
        return {
            success: true,
            filePath: filePath
        };
    } catch (error) {
        console.error('Erro ao salvar dados dos monitores:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Carrega os dados dos monitores do arquivo JSON
 */
function carregarDadosMonitores() {
    try {
        const configDir = path.join(__dirname, '..', 'config');
        const filePath = path.join(configDir, 'monitores-config.json');
        
        if (!fs.existsSync(filePath)) {
            return {
                success: false,
                error: 'Arquivo de configuração não encontrado'
            };
        }
        
        const dados = fs.readFileSync(filePath, 'utf8');
        const dadosCompletos = JSON.parse(dados);
        
        return {
            success: true,
            dados: dadosCompletos
        };
    } catch (error) {
        console.error('Erro ao carregar dados dos monitores:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    detectarMonitores,
    calcularCapacidadeMonitor,
    salvarDadosMonitores,
    carregarDadosMonitores
};