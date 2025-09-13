// Script para navegar para página inicial
// Este script será injetado em todos os navegadores ativos

(function() {
    'use strict';
    
    console.log('🏠 Script de navegação para página inicial executado');
    
    // Criar indicador visual
    const indicator = document.createElement('div');
    indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border: 2px solid #1e40af;
        animation: slideIn 0.3s ease-out;
    `;
    
    // Adicionar animação CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    indicator.innerHTML = '🏠 Navegando para página inicial...';
    document.body.appendChild(indicator);
    
    // Função para navegar para página inicial
    function navigateToHome() {
        try {
            // Navegar para a página inicial usando o domínio raiz
            const homeUrl = window.location.origin + '/';
            
            console.log(`Navegando para: ${homeUrl}`);
            
            // Navegar para a página inicial
            window.location.href = homeUrl;
            
        } catch (error) {
            console.error('Erro ao navegar para página inicial:', error);
            indicator.innerHTML = '❌ Erro ao navegar';
            indicator.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        }
    }
    
    // Executar navegação após um pequeno delay
    setTimeout(() => {
        navigateToHome();
    }, 1000);
    
    // Remover indicador após 3 segundos
    setTimeout(() => {
        if (indicator && indicator.parentNode) {
            indicator.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                indicator.remove();
            }, 300);
        }
    }, 3000);
    
})();