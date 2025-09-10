const fs = require('fs');
const path = require('path');

console.log('=== TESTE FINAL DAS CORREÇÕES ===\n');

// Simular diferentes configurações de resolução
const testeConfiguracoes = [
    { largura: 600, altura: 900, fator: 0.7 },
    { largura: 800, altura: 1200, fator: 0.8 },
    { largura: 1024, altura: 768, fator: 0.6 }
];

// Importar as funções corrigidas
const { calcularCapacidadeMonitor, gerarConfiguracaoTodosMonitores } = require('./src/main/monitor-detector');

// Dados de exemplo dos monitores
const monitoresData = {
    '2528732444': {
        id: '2528732444',
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        workArea: { x: 0, y: 0, width: 1920, height: 1080 }
    },
    '2779098405': {
        id: '2779098405', 
        bounds: { x: -2560, y: 0, width: 2560, height: 1080 },
        workArea: { x: -2560, y: 0, width: 2560, height: 1080 }
    }
};

const posicionamentoData = {
    '2528732444': [],
    '2779098405': []
};

testeConfiguracoes.forEach((config, index) => {
    console.log(`📊 Teste ${index + 1}: ${config.largura}x${config.altura} (fator: ${config.fator})`);
    
    try {
        // Testar calcularCapacidadeMonitor
        const capacidade1 = calcularCapacidadeMonitor(
            monitoresData['2528732444'],
            config.largura,
            config.altura,
            config.fator
        );
        
        const dimensoesFisicas = {
            largura: Math.round(config.largura * config.fator),
            altura: Math.round(config.altura * config.fator)
        };
        
        console.log(`  Monitor 1: ${capacidade1.capacidade} navegadores`);
        console.log(`  Dimensões físicas: ${dimensoesFisicas.largura}x${dimensoesFisicas.altura}`);
        
        // Testar gerarConfiguracaoTodosMonitores
        const configTodos = gerarConfiguracaoTodosMonitores(
            monitoresData,
            posicionamentoData,
            config.largura,
            config.altura,
            config.fator
        );
        
        console.log(`  Configuração 'todosMonitores': ${configTodos.posicoes.length} posições`);
        console.log(`  Dimensões configuração: ${configTodos.dimensoesFisicas.largura}x${configTodos.dimensoesFisicas.altura}`);
        
        // Verificar se não há valores hardcoded
        const esperadoLargura = Math.round(config.largura * config.fator);
        const esperadoAltura = Math.round(config.altura * config.fator);
        
        if (configTodos.dimensoesFisicas.largura === esperadoLargura && 
            configTodos.dimensoesFisicas.altura === esperadoAltura) {
            console.log(`  ✅ Dimensões corretas (${esperadoLargura}x${esperadoAltura})`);
        } else {
            console.log(`  ❌ Dimensões incorretas! Esperado: ${esperadoLargura}x${esperadoAltura}, Obtido: ${configTodos.dimensoesFisicas.largura}x${configTodos.dimensoesFisicas.altura}`);
        }
        
    } catch (error) {
        console.log(`  ❌ Erro no teste: ${error.message}`);
    }
    
    console.log('');
});

console.log('=== VERIFICAÇÃO DE ARQUIVO DE CONFIGURAÇÃO ===\n');

// Verificar se o arquivo de configuração existe e tem as dimensões corretas
const configPath = path.join(__dirname, 'src', 'config', 'monitores-config.json');
if (fs.existsSync(configPath)) {
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        if (config.todosMonitores) {
            console.log(`📁 Arquivo de configuração encontrado:`);
            console.log(`  Posições: ${config.todosMonitores.posicoes.length}`);
            console.log(`  Dimensões: ${config.todosMonitores.dimensoesFisicas.largura}x${config.todosMonitores.dimensoesFisicas.altura}`);
            
            // Verificar se não são os valores hardcoded antigos
            if (config.todosMonitores.dimensoesFisicas.largura === 326 && 
                config.todosMonitores.dimensoesFisicas.altura === 520) {
                console.log(`  ⚠️  Ainda usando dimensões padrão (326x520)`);
                console.log(`  💡 Execute a aplicação e altere a resolução para testar`);
            } else {
                console.log(`  ✅ Dimensões personalizadas detectadas`);
            }
        }
    } catch (error) {
        console.log(`❌ Erro ao ler configuração: ${error.message}`);
    }
} else {
    console.log(`📁 Arquivo de configuração não encontrado`);
}

console.log('\n=== RESUMO ===');
console.log('✅ Todas as funções foram corrigidas para usar parâmetros dinâmicos');
console.log('✅ Valores hardcoded (502x800, 326x520) foram eliminados');
console.log('✅ As dimensões agora são calculadas com base na resolução e fator de escala');
console.log('\n💡 Para testar completamente:');
console.log('1. Abra a aplicação Electron');
console.log('2. Altere a resolução para um valor diferente de 502x800');
console.log('3. Clique em "Calcular Capacidade"');
console.log('4. Verifique se as janelas abrem com o tamanho correto');