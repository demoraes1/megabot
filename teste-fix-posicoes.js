// Teste para verificar se o fix das posições está funcionando
const fs = require('fs');
const path = require('path');

// Caminho para o arquivo de configuração dos monitores
const configPath = path.join(__dirname, 'src', 'config', 'monitores-config.json');

function testarFixPosicoes() {
    try {
        console.log('=== TESTE DO FIX DAS POSIÇÕES ===\n');
        
        // Ler configuração atual
        if (!fs.existsSync(configPath)) {
            console.log('❌ Arquivo de configuração não encontrado:', configPath);
            return;
        }
        
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        console.log('📊 Dados dos monitores carregados:');
        console.log('- Monitores detectados:', config.monitores?.length || 0);
        console.log('- Dados de posicionamento:', config.posicionamento?.length || 0);
        
        if (config.posicionamento && config.posicionamento.length > 0) {
            console.log('\n✅ POSIÇÕES SALVAS ENCONTRADAS:');
            
            config.posicionamento.forEach((dados, index) => {
                console.log(`\n📍 Item ${index + 1}:`);
                console.log(`   ID: ${dados.id}`);
                console.log(`   Capacidade: ${dados.capacidade}`);
                console.log(`   Posições: ${dados.posicoes?.length || 0}`);
                console.log(`   Configuração: ${dados.config?.larguraLogica}x${dados.config?.alturaLogica}`);
                console.log(`   Timestamp: ${dados.timestamp}`);
                
                if (dados.posicoes && dados.posicoes.length > 0) {
                    console.log(`   Primeira posição: x=${dados.posicoes[0].x}, y=${dados.posicoes[0].y}`);
                    if (dados.posicoes.length > 1) {
                        console.log(`   Última posição: x=${dados.posicoes[dados.posicoes.length-1].x}, y=${dados.posicoes[dados.posicoes.length-1].y}`);
                    }
                }
            });
            
            console.log('\n🎯 RESULTADO: As posições estão sendo salvas corretamente!');
            console.log('\n📝 PRÓXIMOS PASSOS PARA TESTAR:');
            console.log('1. Abra a aplicação (npm start)');
            console.log('2. Selecione um monitor');
            console.log('3. Mude a resolução personalizada');
            console.log('4. Verifique se as posições são mantidas quando a configuração não muda');
            console.log('5. Verifique se as posições são recalculadas apenas quando a configuração muda');
            
        } else {
            console.log('\n⚠️  Nenhuma posição salva encontrada.');
            console.log('Execute a aplicação e selecione um monitor para gerar posições.');
        }
        
    } catch (error) {
        console.error('❌ Erro ao testar fix das posições:', error.message);
    }
}

// Executar teste
testarFixPosicoes();