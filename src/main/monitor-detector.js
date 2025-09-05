const { screen } = require('electron');
const fs = require('fs');
const path = require('path');

/**
 * Detecta todos os monitores conectados usando a API nativa do Electron
 * @returns {Object} Resultado da detecção com informações dos monitores
 */
function detectarMonitores() {
    try {
        if (!screen) {
            throw new Error('API screen do Electron não disponível');
        }

        const displays = screen.getAllDisplays();
        
        if (!displays || displays.length === 0) {
            throw new Error('Nenhum monitor detectado');
        }

        console.log(`Detectados ${displays.length} monitor(es)`);

        // Calcular área total de todos os monitores
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        displays.forEach(display => {
            const { x, y, width, height } = display.bounds;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + width);
            maxY = Math.max(maxY, y + height);
        });

        const areaTotal = {
            x: minX,
            y: minY,
            largura: maxX - minX,
            altura: maxY - minY
        };

        // Processar detalhes de cada monitor
        const detalhes = displays.map((display, index) => {
            const { bounds, scaleFactor } = display;
            const isPrimary = display.id === screen.getPrimaryDisplay().id;
            
            return {
                id: display.id,
                nome: `Monitor ${index + 1}`,
                fabricante: 'Electron Display',
                resolucao: `${bounds.width}x${bounds.height}`,
                posicao: `x: ${bounds.x}, y: ${bounds.y}`,
                ehPrimario: isPrimary,
                scaleFactor: scaleFactor,
                bounds: {
                    x: bounds.x,
                    y: bounds.y,
                    width: bounds.width,
                    height: bounds.height
                }
            };
        });

        const resultado = {
            areaTotal,
            quantidade: displays.length,
            detalhes
        };

        console.log('Detecção de monitores concluída:', {
            quantidade: resultado.quantidade,
            areaTotal: resultado.areaTotal
        });

        return {
            success: true,
            monitores: resultado
        };
    } catch (error) {
        console.error('Erro na detecção de monitores:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Calcula a capacidade de navegadores para um monitor específico
 * @param {Object} bounds - Bounds do monitor
 * @param {number} larguraLogica - Largura lógica do navegador (padrão: 502)
 * @param {number} alturaLogica - Altura lógica do navegador (padrão: 800)
 * @param {number} fatorEscala - Fator de escala (padrão: 0.65)
 * @returns {Object} Capacidade e posições disponíveis
 */
function calcularCapacidadeMonitor(bounds, larguraLogica = 502, alturaLogica = 800, fatorEscala = 0.65) {
    try {
        // Verificar se bounds é válido
        if (!bounds || typeof bounds.x === 'undefined' || typeof bounds.y === 'undefined') {
            throw new Error('Bounds do monitor inválidos');
        }
        
        const LARGURA_FISICA = Math.round(larguraLogica * fatorEscala);
        const ALTURA_FISICA = Math.round(alturaLogica * fatorEscala);
        
        const posicoes = [];
        let navegadorId = 0;
        
        // Calcular posições em grade
        for (let y = bounds.y; y + ALTURA_FISICA <= bounds.y + bounds.height; y += ALTURA_FISICA) {
            for (let x = bounds.x; x + LARGURA_FISICA <= bounds.x + bounds.width; x += LARGURA_FISICA) {
                posicoes.push({
                    id: navegadorId++,
                    x: x,
                    y: y
                });
            }
        }
        
        return {
            capacidade: posicoes.length,
            posicoes: posicoes,
            dimensoesFisicas: {
                largura: LARGURA_FISICA,
                altura: ALTURA_FISICA
            }
        };
    } catch (error) {
        console.error('Erro ao calcular capacidade do monitor:', error.message);
        return {
            capacidade: 0,
            posicoes: [],
            dimensoesFisicas: {
                largura: 0,
                altura: 0
            }
        };
    }
}

/**
 * Salva os dados dos monitores em arquivo JSON
 * @param {Object} monitoresData - Dados dos monitores
 * @param {Object} posicionamentoData - Dados de posicionamento
 * @returns {Object} Resultado da operação
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
        console.error('Erro ao salvar dados dos monitores:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Carrega os dados dos monitores do arquivo JSON
 * @returns {Object} Dados carregados ou erro
 */
function carregarDadosMonitores() {
    try {
        const configDir = path.join(__dirname, '..', 'config');
        const filePath = path.join(configDir, 'monitores-config.json');
        
        if (!fs.existsSync(filePath)) {
            console.log('Arquivo de configuração não encontrado, criando novo...');
            return criarConfiguracaoInicial();
        }
        
        const dados = fs.readFileSync(filePath, 'utf8');
        const dadosCompletos = JSON.parse(dados);
        
        // Verificar se a configuração ainda é válida
        const monitoresAtuais = detectarMonitores();
        if (monitoresAtuais.success && precisaAtualizar(dadosCompletos.monitores, monitoresAtuais.monitores)) {
            console.log('Detectada mudança nos monitores, atualizando configuração...');
            return criarConfiguracaoInicial();
        }
        
        console.log('Dados dos monitores carregados com sucesso');
        return {
            success: true,
            dados: dadosCompletos  // Mudança aqui: usar 'dados' em vez de 'data'
        };
    } catch (error) {
        console.error('Erro ao carregar dados dos monitores:', error.message);
        console.log('Criando nova configuração devido ao erro...');
        return criarConfiguracaoInicial();
    }
}

/**
 * Cria uma configuração inicial detectando monitores e calculando posicionamento
 * @returns {Object} Configuração criada
 */
function criarConfiguracaoInicial() {
    try {
        console.log('Criando configuração inicial dos monitores...');
        
        const resultadoDeteccao = detectarMonitores();
        
        if (!resultadoDeteccao.success) {
            return {
                success: false,
                error: 'Falha ao detectar monitores para configuração inicial'
            };
        }
        
        // Calcular posicionamento para cada monitor
        const posicionamentoData = {};
        
        resultadoDeteccao.monitores.detalhes.forEach(monitor => {
            const capacidadeInfo = calcularCapacidadeMonitor(monitor.bounds);
            posicionamentoData[monitor.id] = capacidadeInfo;
            
            console.log(`Monitor ${monitor.id}: ${capacidadeInfo.capacidade} navegadores`);
            console.log(`  Dimensões físicas: ${capacidadeInfo.dimensoesFisicas.largura}x${capacidadeInfo.dimensoesFisicas.altura}`);
            console.log(`  Bounds: x:${monitor.bounds.x}, y:${monitor.bounds.y}, w:${monitor.bounds.width}, h:${monitor.bounds.height}`);
        });
        
        // Salvar configuração
        const resultadoSalvar = salvarDadosMonitores(resultadoDeteccao.monitores, posicionamentoData);
        
        if (!resultadoSalvar.success) {
            return {
                success: false,
                error: 'Falha ao salvar configuração inicial'
            };
        }
        
        const dadosCompletos = {
            timestamp: new Date().toISOString(),
            monitores: resultadoDeteccao.monitores,
            posicionamento: posicionamentoData
        };
        
        console.log('Configuração inicial criada com sucesso');
        
        return {
            success: true,
            dados: dadosCompletos  // Mudança aqui: usar 'dados' em vez de 'data'
        };
    } catch (error) {
        console.error('Erro ao criar configuração inicial:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Verifica se a configuração precisa ser atualizada
 * @param {Object} configAntiga - Configuração anterior
 * @param {Object} configNova - Nova configuração detectada
 * @returns {boolean} True se precisa atualizar
 */
function precisaAtualizar(configAntiga, configNova) {
    if (!configAntiga || !configNova) return true;
    
    // Verificar se o número de monitores mudou
    if (configAntiga.quantidade !== configNova.quantidade) {
        console.log('Número de monitores mudou');
        return true;
    }
    
    // Verificar se as resoluções ou posições mudaram
    for (let i = 0; i < configNova.detalhes.length; i++) {
        const monitorNovo = configNova.detalhes[i];
        const monitorAntigo = configAntiga.detalhes.find(m => m.id === monitorNovo.id);
        
        if (!monitorAntigo) {
            console.log(`Monitor ${monitorNovo.id} não encontrado na configuração antiga`);
            return true;
        }
        
        if (monitorAntigo.resolucao !== monitorNovo.resolucao || 
            monitorAntigo.posicao !== monitorNovo.posicao) {
            console.log(`Monitor ${monitorNovo.id} teve mudanças na resolução ou posição`);
            return true;
        }
    }
    
    return false;
}

// Variável para controlar debounce dos listeners
let timeoutAtualizacao = null;

/**
 * Atualiza configuração com debounce para evitar loops
 */
function atualizarConfiguracaoComDebounce() {
    if (timeoutAtualizacao) {
        clearTimeout(timeoutAtualizacao);
    }
    
    timeoutAtualizacao = setTimeout(() => {
        try {
            console.log('Detectada mudança nos monitores, atualizando configuração...');
            
            // Verificar se realmente houve mudança
            const configAtual = carregarDadosMonitores();
            const novaDeteccao = detectarMonitores();
            
            if (configAtual.success && novaDeteccao.success && 
                !precisaAtualizar(configAtual.dados.monitores, novaDeteccao.monitores)) {
                console.log('Nenhuma mudança real detectada, ignorando atualização');
                return;
            }
            
            criarConfiguracaoInicial();
        } catch (error) {
            console.error('Erro ao atualizar configuração de monitores:', error.message);
        }
    }, 1000); // Debounce de 1 segundo
}

/**
 * Configura listeners para mudanças nos monitores
 */
function configurarListenerMonitores() {
    if (!screen) {
        console.warn('API screen do Electron não disponível para configurar listeners');
        return;
    }
    
    try {
        screen.on('display-added', () => {
            console.log('Monitor adicionado');
            atualizarConfiguracaoComDebounce();
        });
        
        screen.on('display-removed', () => {
            console.log('Monitor removido');
            atualizarConfiguracaoComDebounce();
        });
        
        screen.on('display-metrics-changed', () => {
            console.log('Métricas do monitor mudaram');
            atualizarConfiguracaoComDebounce();
        });
        
        console.log('Listeners de mudança de monitor configurados com debounce');
    } catch (error) {
        console.error('Erro ao configurar listeners de monitor:', error.message);
    }
}

module.exports = {
    detectarMonitores,
    calcularCapacidadeMonitor,
    salvarDadosMonitores,
    carregarDadosMonitores,
    criarConfiguracaoInicial,
    configurarListenerMonitores,
    precisaAtualizar
};