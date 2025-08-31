/**
 * Script para recarregar a página atual do navegador
 * Este script será injetado nos navegadores para atualizar suas páginas
 */

(function() {
    'use strict';
    
    console.log('🔄 Script de reload iniciado');
    
    // Criar indicador visual temporário
    const indicator = document.createElement('div');
    indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(45deg, #4CAF50, #45a049);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        font-weight: bold;
        z-index: 999999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border: 2px solid #fff;
        animation: slideIn 0.3s ease-out;
    `;
    
    // Adicionar animação CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes fadeOut {
            from {
                opacity: 1;
            }
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
    `;
    document.head.appendChild(style);
    
    indicator.innerHTML = '🔄 Recarregando página...';
    document.body.appendChild(indicator);
    
    // Log da ação
    console.log('📄 Página atual:', window.location.href);
    console.log('⏰ Timestamp:', new Date().toLocaleString());
    
    // Aguardar um momento para mostrar o indicador
    setTimeout(() => {
        // Animar saída do indicador
        indicator.style.animation = 'fadeOut 0.3s ease-in';
        
        setTimeout(() => {
            // Recarregar a página
            console.log('🔄 Executando reload da página...');
            window.location.reload(true); // true força reload do cache
        }, 300);
    }, 1000);
    
    // Retornar informações sobre a operação
    return {
        action: 'reload',
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        success: true
    };
    
})();