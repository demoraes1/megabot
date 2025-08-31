# Sistema Padronizado de Injeção de Scripts

Este documento explica como usar o sistema padronizado de injeção de scripts implementado no MegaBot.

## Como Funciona

O sistema permite que qualquer botão execute scripts nos navegadores ativos usando apenas data attributes no HTML, sem necessidade de duplicar código JavaScript.

## Como Usar

### 1. Configurar um Botão no HTML

Adicione os seguintes data attributes ao seu botão:

```html
<button 
    data-inject-script="nome-do-script" 
    data-notification="Mensagem de sucesso personalizada" 
    data-confirm="Mensagem de confirmação (opcional)"
    class="seu-estilo-css">
    Texto do Botão
</button>
```

### 2. Criar o Script

Crie um arquivo `.js` na pasta `src/automation/scripts/` com o nome especificado em `data-inject-script`.

**Exemplo: `src/automation/scripts/meu-script.js`**

```javascript
// Meu script personalizado
(function() {
    'use strict';
    
    console.log('Meu script executado!');
    
    // Criar indicador visual
    const indicator = document.createElement('div');
    indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    indicator.innerHTML = '✅ Meu script executado!';
    document.body.appendChild(indicator);
    
    // Sua lógica aqui
    // ...
    
    // Remover indicador após 3 segundos
    setTimeout(() => {
        if (indicator && indicator.parentNode) {
            indicator.remove();
        }
    }, 3000);
    
})();
```

### 3. Pronto!

O sistema automaticamente:
- Detecta o botão com `data-inject-script`
- Carrega o script correspondente
- Injeta em todos os navegadores ativos
- Mostra notificações de sucesso/erro
- Registra logs no console

## Exemplos Implementados

### Botão Home
```html
<button 
    data-inject-script="home" 
    data-notification="Navegando para página inicial em todos os navegadores" 
    data-confirm="Deseja navegar para a página inicial em todos os navegadores?">
    🏠 Página inicial
</button>
```

### Botão Relatórios
```html
<button 
    data-inject-script="reports" 
    data-notification="Abrindo relatórios em todos os navegadores" 
    data-confirm="Deseja abrir a página de relatórios em todos os navegadores?">
    📊 Relatórios
</button>
```

## Data Attributes Disponíveis

| Attribute | Obrigatório | Descrição |
|-----------|-------------|----------|
| `data-inject-script` | ✅ | Nome do script (sem extensão .js) |
| `data-notification` | ❌ | Mensagem de sucesso personalizada |
| `data-confirm` | ❌ | Mensagem de confirmação antes da execução |

## Vantagens do Sistema

1. **Sem Duplicação de Código**: Um handler único para todos os botões
2. **Configuração Simples**: Apenas data attributes no HTML
3. **Reutilizável**: Scripts podem ser usados por múltiplos botões
4. **Notificações Automáticas**: Sistema integrado de feedback
5. **Confirmações Opcionais**: Proteção contra cliques acidentais
6. **Logs Automáticos**: Rastreamento de execução no console

## Scripts Customizados

Também é possível injetar código JavaScript diretamente:

```javascript
// Exemplo de uso programático
window.injectCustomScript(
    'alert("Hello from custom script!");',
    'Script customizado executado com sucesso!'
);
```

## Estrutura de Arquivos

```
src/
├── automation/
│   ├── scripts/
│   │   ├── home.js          # Script de navegação para home
│   │   ├── reports.js       # Script de navegação para relatórios
│   │   ├── reload.js        # Script de refresh de páginas
│   │   └── meu-script.js    # Seus scripts personalizados
│   └── injection.js         # Módulo de injeção
├── renderer/
│   ├── app.js              # Sistema padronizado implementado aqui
│   └── index.html          # Botões com data attributes
└── main/
    ├── main.js             # Handlers IPC
    ├── preload.js          # Bridge Electron
    └── browser-manager.js  # Gerenciamento de navegadores
```

Este sistema torna muito fácil adicionar novos botões de injeção de scripts sem modificar o código JavaScript principal!