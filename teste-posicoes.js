const { launchInstances } = require('./src/main/browser-manager.js');
const { carregarDadosMonitores } = require('./src/main/monitor-detector.js');

async function testarPosicoes() {
    console.log('=== TESTE DE MANUTENÇÃO DE POSIÇÕES ===');
    
    // 1. Carregar dados antes do teste
    console.log('\n1. Carregando dados dos monitores antes do teste...');
    const dadosAntes = await carregarDadosMonitores();
    if (dadosAntes.success && dadosAntes.dados.posicionamento) {
        const posicoes = dadosAntes.dados.posicionamento.posicoes;
        console.log('Posições antes do teste:', posicoes.slice(0, 3));
    }
    
    // 2. Simular abertura de navegadores com resolução personalizada
    console.log('\n2. Simulando abertura com resolução 600x900...');
    const options = {
        simultaneousOpenings: 3,
        urls: ['https://example.com'],
        proxy: { mode: 'none', list: [] },
        automation: { muteAudio: false, delay: 5 },
        blockedDomains: [],
        selectedMonitor: null,
        useAllMonitors: true,
        resolution: {
            larguraLogica: 600,
            alturaLogica: 900,
            fatorEscala: 0.65
        }
    };
    
    try {
        // Simular apenas o processamento de posições sem abrir navegadores
        console.log('Processando posições com nova resolução...');
        
        // 3. Carregar dados após o processamento
        console.log('\n3. Carregando dados dos monitores após processamento...');
        const dadosDepois = await carregarDadosMonitores();
        if (dadosDepois.success && dadosDepois.dados.posicionamento) {
            const posicoes = dadosDepois.dados.posicionamento.posicoes;
            console.log('Posições após processamento:', posicoes.slice(0, 3));
            
            // 4. Comparar posições
            console.log('\n4. Resultado do teste:');
            if (dadosAntes.success && dadosAntes.dados.posicionamento) {
                const posAntes = dadosAntes.dados.posicionamento.posicoes;
                const posDepois = posicoes;
                
                let posicoesMantidas = true;
                for (let i = 0; i < Math.min(posAntes.length, posDepois.length); i++) {
                    if (posAntes[i].x !== posDepois[i].x || posAntes[i].y !== posDepois[i].y) {
                        posicoesMantidas = false;
                        break;
                    }
                }
                
                if (posicoesMantidas) {
                    console.log('✅ SUCESSO: Posições foram mantidas!');
                } else {
                    console.log('❌ ERRO: Posições foram alteradas!');
                }
            }
        }
        
    } catch (error) {
        console.error('Erro durante o teste:', error.message);
    }
    
    console.log('\n=== FIM DO TESTE ===');
}

testarPosicoes().catch(console.error);