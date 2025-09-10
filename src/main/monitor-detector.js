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
        
        console.log(`[DEBUG] Dimensões físicas calculadas: ${LARGURA_FISICA}x${ALTURA_FISICA}`);
        console.log(`[DEBUG] Resolução lógica: ${larguraLogica}x${alturaLogica}, Fator escala: ${fatorEscala}`);
        
        const posicoes = [];
        let navegadorId = 0;
        
        // Calcular posições em grade sem sobreposição
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
                largura: Math.round(larguraLogica * fatorEscala),
                altura: Math.round(alturaLogica * fatorEscala)
            }
        };
    }
}

/**
 * Atualiza as posições no monitores-config.json baseado nas dimensões físicas calculadas
 * @param {string} configPath - Caminho para o arquivo de configuração
 * @param {number} larguraLogica - Largura lógica da janela
 * @param {number} alturaLogica - Altura lógica da janela
 * @param {number} fatorEscala - Fator de escala aplicado
 */
function atualizarPosicoesConfig(configPath, larguraLogica = 502, alturaLogica = 800, fatorEscala = 0.65) {
    try {
        // Usando imports globais já disponíveis
        
        if (!fs.existsSync(configPath)) {
            console.log('[DEBUG] Arquivo de configuração não encontrado, será criado automaticamente.');
            return;
        }
        
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const LARGURA_FISICA = Math.round(larguraLogica * fatorEscala);
        const ALTURA_FISICA = Math.round(alturaLogica * fatorEscala);
        
        console.log(`[DEBUG] Atualizando posições para dimensões: ${LARGURA_FISICA}x${ALTURA_FISICA}`);
        
        // Atualizar dimensões físicas em todos os monitores
        if (config.posicionamento && typeof config.posicionamento === 'object') {
            Object.keys(config.posicionamento).forEach(monitorId => {
                const posicionamento = config.posicionamento[monitorId];
                if (posicionamento.posicoes && Array.isArray(posicionamento.posicoes)) {
                    // Recalcular posições baseado nas dimensões do monitor
                    const bounds = posicionamento.monitor?.bounds || { x: 0, y: 0, width: 1920, height: 1080 };
                    const novasCapacidades = calcularCapacidadeMonitor(bounds, larguraLogica, alturaLogica, fatorEscala);
                    
                    // Atualizar posições mantendo os IDs existentes quando possível
                    posicionamento.posicoes = novasCapacidades.posicoes.map((pos, index) => ({
                        id: index,
                        x: pos.x,
                        y: pos.y,
                        width: LARGURA_FISICA,
                        height: ALTURA_FISICA
                    }));
                    
                    // Atualizar configuração
                    posicionamento.config = {
                        larguraLogica: larguraLogica,
                        alturaLogica: alturaLogica,
                        fatorEscala: fatorEscala
                    };
                    
                    // Atualizar dimensões físicas
                    posicionamento.dimensoesFisicas = {
                        largura: LARGURA_FISICA,
                        altura: ALTURA_FISICA
                    };
                    
                    // Atualizar capacidade
                    posicionamento.capacidade = novasCapacidades.capacidade;
                    
                    // Atualizar timestamp
                    posicionamento.timestamp = new Date().toISOString();
                }
            });
        }
        
        // Atualizar configuração global se existir
        if (config.todosMonitores && config.todosMonitores.dimensoesFisicas) {
            config.todosMonitores.dimensoesFisicas = {
                largura: LARGURA_FISICA,
                altura: ALTURA_FISICA
            };
        }
        
        // Salvar configuração atualizada
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(`[DEBUG] Configuração atualizada salva em: ${configPath}`);
        
    } catch (error) {
        console.error('Erro ao atualizar posições no config:', error.message);
    }
}


/**
 * Gera configuração automática para "todosMonitores"
 * @param {Object} monitoresData - Dados dos monitores
 * @param {Object} posicionamentoData - Dados de posicionamento individual
 * @returns {Object} Configuração para todos os monitores
 */
function gerarConfiguracaoTodosMonitores(monitoresData, posicionamentoData, larguraLogica = 502, alturaLogica = 800, fatorEscala = 0.65) {
    try {
        const { areaTotal } = monitoresData;
        const LARGURA_FISICA = Math.round(larguraLogica * fatorEscala);
        const ALTURA_FISICA = Math.round(alturaLogica * fatorEscala);
        
        const posicoes = [];
        let navegadorId = 0;
        
        // Calcular posições em grade contínua através de todos os monitores
        for (let y = areaTotal.y; y + ALTURA_FISICA <= areaTotal.y + areaTotal.altura; y += ALTURA_FISICA) {
            for (let x = areaTotal.x; x + LARGURA_FISICA <= areaTotal.x + areaTotal.largura; x += LARGURA_FISICA) {
                // Verificar se a posição está dentro de algum monitor
                const dentroDeMonitor = monitoresData.detalhes.some(monitor => {
                    const bounds = monitor.bounds;
                    return x >= bounds.x && x + LARGURA_FISICA <= bounds.x + bounds.width &&
                           y >= bounds.y && y + ALTURA_FISICA <= bounds.y + bounds.height;
                });
                
                if (dentroDeMonitor) {
                    posicoes.push({
                        id: navegadorId++,
                        x: x,
                        y: y
                    });
                }
            }
        }
        
        console.log(`Configuração "todosMonitores" gerada com ${posicoes.length} posições`);
        
        return {
            capacidade: posicoes.length,
            posicoes: posicoes,
            dimensoesFisicas: {
                largura: LARGURA_FISICA,
                altura: ALTURA_FISICA
            }
        };
    } catch (error) {
        console.error('Erro ao gerar configuração todosMonitores:', error.message);
        return {
            capacidade: 0,
            posicoes: [],
            dimensoesFisicas: {
                largura: Math.round(larguraLogica * fatorEscala),
                altura: Math.round(alturaLogica * fatorEscala)
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
function salvarDadosMonitores(monitoresData, posicionamentoData, config = {}) {
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
        
        // Gerar configuração "todosMonitores" automaticamente se há múltiplos monitores
        if (monitoresData.detalhes && monitoresData.detalhes.length > 1) {
            const { larguraLogica = 502, alturaLogica = 800, fatorEscala = 0.65 } = config;
            dadosCompletos.todosMonitores = gerarConfiguracaoTodosMonitores(monitoresData, posicionamentoData, larguraLogica, alturaLogica, fatorEscala);
            console.log('Configuração "todosMonitores" gerada automaticamente');
        }
        
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
            console.log('Arquivo de configuração não encontrado');
            return {
                success: false,
                error: 'Arquivo de configuração não encontrado. Use a interface para detectar monitores.'
            };
        }
        
        const dados = fs.readFileSync(filePath, 'utf8');
        const dadosCompletos = JSON.parse(dados);
        
        // Verificar se a configuração ainda é válida
        const monitoresAtuais = detectarMonitores();
        if (monitoresAtuais.success && precisaAtualizar(dadosCompletos.monitores, monitoresAtuais.monitores)) {
            console.log('Detectada mudança nos monitores, mas mantendo configuração existente');
            // Não resetar automaticamente - deixar o usuário decidir
        }
        
        console.log('Dados dos monitores carregados com sucesso');
        return {
            success: true,
            dados: dadosCompletos  // Mudança aqui: usar 'dados' em vez de 'data'
        };
    } catch (error) {
        console.error('Erro ao carregar dados dos monitores:', error.message);
        return {
            success: false,
            error: 'Erro ao carregar configuração: ' + error.message
        };
    }
}

// Função criarConfiguracaoInicial removida - não era mais utilizada após correções
// A configuração inicial agora é criada dinamicamente quando necessário

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
            
            // Removido criarConfiguracaoInicial() para evitar reset automático dos valores
            // A configuração será atualizada apenas quando solicitada pelo usuário
            console.log('Mudança nos monitores detectada, mas configuração mantida');
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
    atualizarPosicoesConfig,
    gerarConfiguracaoTodosMonitores,
    salvarDadosMonitores,
    carregarDadosMonitores,
    configurarListenerMonitores,
    precisaAtualizar
};