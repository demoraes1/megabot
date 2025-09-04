# Integração de Dados do Perfil no Sistema de Registro Automático

## Visão Geral

Este documento detalha as modificações implementadas para integrar os dados dos perfis armazenados no `config.json` com o sistema de registro automático, substituindo a geração de dados aleatórios por dados reais da fábrica de dados.

## Problema Identificado

O script de registro automático (`registro.js`) estava gerando dados de fallback aleatórios em vez de utilizar os dados reais dos perfis criados pela fábrica de dados e armazenados no `config.json`.

## Arquivos Modificados

### 1. `src/browser/stealth-instance.js`

**Localização da Modificação:** Linhas ~970-985

**Problema:** O script era injetado diretamente sem passar os dados do perfil para o contexto do navegador.

**Solução Implementada:**
```javascript
// Código adicionado na função que processa mensagens 'inject-script'
if (message.waitForLoad) {
    // Injetar dados do perfil no window.profileData antes do script principal
    if (global.browserProfile) {
        const profileDataScript = `
            window.profileData = {
                usuario: '${global.browserProfile.usuario}',
                nome_completo: '${global.browserProfile.nome_completo}',
                senha: '${global.browserProfile.senha}',
                telefone: '${global.browserProfile.telefone}',
                cpf: '${global.browserProfile.cpf}'
            };
        `;
        await page.evaluate(profileDataScript);
    }
}
```

**Explicação:** Esta modificação injeta os dados do perfil no objeto `window.profileData` antes da execução do script principal, tornando-os disponíveis para o script de registro.

### 2. `src/automation/scripts/registro.js`

**Localização da Modificação:** Função `generateUserData()` (linhas ~55-75)

**Problema:** A função sempre gerava dados aleatórios, ignorando os dados do perfil injetados.

**Solução Implementada:**
```javascript
function generateUserData() {
    // Verificar se há dados do perfil injetados
    if (window.profileData && window.profileData.usuario) {
        log('Usando dados do perfil injetado');
        return {
            account: window.profileData.usuario,
            password: window.profileData.senha,
            phone: window.profileData.telefone,
            realName: window.profileData.nome_completo
        };
    }
    
    // Fallback: gerar dados aleatórios se não houver dados do perfil
    log('AVISO: Dados do perfil não encontrados, usando fallback');
    // ... código de fallback existente
}
```

**Explicação:** A função agora verifica primeiro se `window.profileData` está disponível e usa esses dados. Caso contrário, mantém o comportamento de fallback original.

## Fluxo de Dados

1. **Geração do Perfil:** A fábrica de dados cria um perfil com dados únicos
2. **Armazenamento:** O perfil é salvo no `config.json`
3. **Carregamento:** O perfil é carregado em `global.browserProfile`
4. **Injeção:** Os dados são injetados no `window.profileData` do navegador
5. **Utilização:** O script de registro usa os dados injetados

## Estrutura de Dados

### Dados do Perfil (config.json)
```json
{
  "id": "profile_xxxxx",
  "usuario": "NomeUsuario",
  "nome_completo": "Nome Completo do Usuário",
  "telefone": "11999999999",
  "cpf": "123.456.789-00",
  "senha": "SenhaGerada123!",
  "proxy": "proxy.exemplo.com:5900",
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

### Dados Injetados (window.profileData)
```javascript
window.profileData = {
    usuario: 'NomeUsuario',
    nome_completo: 'Nome Completo do Usuário',
    senha: 'SenhaGerada123!',
    telefone: '11999999999',
    cpf: '123.456.789-00'
};
```

## Instruções para Reimplementação

### Passo 1: Modificar stealth-instance.js

1. Localize o arquivo `src/browser/stealth-instance.js`
2. Encontre a função que processa mensagens com `action: 'inject-script'`
3. Adicione o código de injeção de dados do perfil antes da execução do script principal:

```javascript
// Adicionar após a verificação de waitForLoad
if (message.waitForLoad) {
    // Aguardar carregamento da página
    await page.waitForLoadState('domcontentloaded');
    
    // Injetar dados do perfil se disponíveis
    if (global.browserProfile) {
        const profileDataScript = `
            window.profileData = {
                usuario: '${global.browserProfile.usuario}',
                nome_completo: '${global.browserProfile.nome_completo}',
                senha: '${global.browserProfile.senha}',
                telefone: '${global.browserProfile.telefone}',
                cpf: '${global.browserProfile.cpf}'
            };
        `;
        await page.evaluate(profileDataScript);
    }
}
```

### Passo 2: Modificar registro.js

1. Localize o arquivo `src/automation/scripts/registro.js`
2. Encontre a função `generateUserData()`
3. Substitua o conteúdo da função pelo código que verifica `window.profileData`:

```javascript
function generateUserData() {
    // Verificar se há dados do perfil injetados
    if (window.profileData && window.profileData.usuario) {
        log('Usando dados do perfil injetado');
        return {
            account: window.profileData.usuario,
            password: window.profileData.senha,
            phone: window.profileData.telefone,
            realName: window.profileData.nome_completo
        };
    }
    
    // Fallback: gerar dados aleatórios se não houver dados do perfil
    log('AVISO: Dados do perfil não encontrados, usando fallback');
    
    // Manter código de fallback existente aqui
    const randomId = Math.floor(Math.random() * 90000 + 10000);
    const firstName = "Usuario";
    const lastName = `Teste${randomId}`;
    
    const ddd = '11';
    const randomNumberPart = Math.floor(Math.random() * 90000000 + 10000000);
    const fullPhone = `${ddd}9${randomNumberPart}`;
    
    return {
        account: `${firstName.toLowerCase()}${randomId}`,
        password: `SenhaForte${randomId}!`,
        phone: fullPhone,
        realName: `${firstName} ${lastName}`
    };
}
```

## Verificação da Implementação

### Logs de Sucesso
Quando funcionando corretamente, você deve ver nos logs:
- `[AutoRegistro Script] Usando dados do perfil injetado`
- Dados reais sendo utilizados no formulário de registro

### Logs de Fallback
Se os dados não estiverem disponíveis:
- `[AutoRegistro Script] AVISO: Dados do perfil não encontrados, usando fallback`
- Dados aleatórios sendo gerados

## Benefícios da Implementação

1. **Consistência:** Usa dados reais da fábrica de dados
2. **Rastreabilidade:** Cada registro está vinculado a um perfil específico
3. **Realismo:** Dados mais realistas para testes
4. **Fallback Seguro:** Mantém funcionalidade mesmo se dados não estiverem disponíveis
5. **Logs Informativos:** Facilita debugging e monitoramento

## Considerações de Segurança

- Os dados são injetados apenas no contexto do navegador específico
- Não há exposição de dados sensíveis em logs
- O fallback garante que o sistema continue funcionando mesmo com falhas

## Troubleshooting

### Problema: Script ainda usa dados de fallback
**Solução:** Verificar se `global.browserProfile` está sendo definido corretamente

### Problema: Dados não aparecem no window.profileData
**Solução:** Verificar se a injeção está ocorrendo antes da execução do script principal

### Problema: Erro de sintaxe na injeção
**Solução:** Verificar escape de caracteres especiais nos dados do perfil