const fs = require('fs');
const path = require('path');

// Função para verificar valores hardcoded no código
function verificarValoresHardcoded() {
    console.log('=== VERIFICAÇÃO DE VALORES HARDCODED ===\n');
    
    const arquivos = [
        'src/main/monitor-detector.js',
        'src/main/browser-manager.js',
        'src/renderer/app.js'
    ];
    
    let problemasEncontrados = 0;
    
    arquivos.forEach(arquivo => {
        const caminhoCompleto = path.join(__dirname, arquivo);
        
        if (fs.existsSync(caminhoCompleto)) {
            const conteudo = fs.readFileSync(caminhoCompleto, 'utf8');
            const linhas = conteudo.split('\n');
            
            console.log(`📁 Verificando ${arquivo}:`);
            
            // Procurar por valores hardcoded suspeitos
            const padroes = [
                { regex: /502.*\*.*0\.65/g, descricao: '502 * 0.65 (hardcoded)' },
                { regex: /800.*\*.*0\.65/g, descricao: '800 * 0.65 (hardcoded)' },
                { regex: /Math\.round\(502/g, descricao: 'Math.round(502...)' },
                { regex: /Math\.round\(800/g, descricao: 'Math.round(800...)' },
                { regex: /largura:\s*326/g, descricao: 'largura: 326 (hardcoded)' },
                { regex: /altura:\s*520/g, descricao: 'altura: 520 (hardcoded)' }
            ];
            
            let problemasArquivo = 0;
            
            padroes.forEach(padrao => {
                const matches = conteudo.match(padrao.regex);
                if (matches) {
                    matches.forEach(match => {
                        const numeroLinha = conteudo.substring(0, conteudo.indexOf(match)).split('\n').length;
                        console.log(`  ⚠️  Linha ${numeroLinha}: ${padrao.descricao} - "${match.trim()}"`);  
                        problemasArquivo++;
                        problemasEncontrados++;
                    });
                }
            });
            
            if (problemasArquivo === 0) {
                console.log('  ✅ Nenhum valor hardcoded encontrado');
            }
            
            console.log('');
        } else {
            console.log(`❌ Arquivo não encontrado: ${arquivo}\n`);
        }
    });
    
    console.log('=== RESUMO ===');
    if (problemasEncontrados === 0) {
        console.log('✅ Nenhum valor hardcoded problemático encontrado!');
        console.log('As correções foram aplicadas com sucesso.');
    } else {
        console.log(`⚠️  ${problemasEncontrados} problema(s) encontrado(s).`);
        console.log('Ainda existem valores hardcoded que podem causar reset das posições.');
    }
}

// Função para testar configuração atual
function testarConfiguracaoAtual() {
    console.log('\n=== TESTE DE CONFIGURAÇÃO ATUAL ===\n');
    
    const configPath = path.join(__dirname, 'src', 'config', 'monitores-config.json');
    
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        console.log('📊 Configuração atual:');
        console.log(`- Monitores detectados: ${config.monitores?.quantidade || 0}`);
        
        if (config.posicionamento) {
            const monitores = Object.keys(config.posicionamento);
            console.log(`- Monitores com posicionamento: ${monitores.length}`);
            
            monitores.forEach(monitorId => {
                const pos = config.posicionamento[monitorId];
                if (pos.dimensoesFisicas) {
                    console.log(`  Monitor ${monitorId}: ${pos.dimensoesFisicas.largura}x${pos.dimensoesFisicas.altura}`);
                }
                if (pos.config) {
                    console.log(`    Config: ${pos.config.larguraLogica}x${pos.config.alturaLogica} (escala: ${pos.config.fatorEscala})`);
                }
            });
        }
        
        if (config.todosMonitores) {
            console.log(`- Configuração "todosMonitores": ${config.todosMonitores.capacidade} posições`);
            if (config.todosMonitores.dimensoesFisicas) {
                console.log(`  Dimensões: ${config.todosMonitores.dimensoesFisicas.largura}x${config.todosMonitores.dimensoesFisicas.altura}`);
            }
        }
    } else {
        console.log('❌ Arquivo de configuração não encontrado.');
    }
}

// Executar verificações
verificarValoresHardcoded();
testarConfiguracaoAtual();

console.log('\n=== PRÓXIMOS PASSOS ===');
console.log('1. Abra a aplicação (http://localhost:3000)');
console.log('2. Altere a resolução para um valor diferente de 502x800');
console.log('3. Clique em "Calcular Capacidade"');
console.log('4. Clique em "Abrir Navegadores"');
console.log('5. Verifique se as janelas abrem com o tamanho correto (não 502x800)');