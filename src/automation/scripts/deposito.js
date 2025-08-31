// --- SCRIPT FINAL UNIFICADO ---
// Combina a navegação com a automação de depósito de forma robusta.

(function() {
    'use strict';

    console.log('Iniciando script de automação...');

    // --- PARTE 1: LÓGICA DE NAVEGAÇÃO ---
    // Verifica se não estamos na página de perfil para fazer o redirecionamento.
    if (!window.location.pathname.includes('/home/mine')) {
        console.log('Página incorreta. Navegando para /home/mine...');
        // Armazena um "lembrete" para saber que a próxima ação é a automação.
        sessionStorage.setItem('runDepositAutomation', 'true');
        // Redireciona o navegador.
        window.location.href = window.location.origin + '/home/mine';
        return; // Para a execução do script aqui.
    }

    // --- PARTE 2: LÓGICA DE AUTOMAÇÃO ---
    // Se o script chegou até aqui, estamos na página /home/mine.
    // Verificamos se o "lembrete" existe para rodar a automação apenas uma vez.
    if (sessionStorage.getItem('runDepositAutomation') === 'true') {
        
        // Limpa o lembrete para não executar novamente se a página for recarregada.
        sessionStorage.removeItem('runDepositAutomation');
        console.log('Na página de perfil. Iniciando automação de depósito...');

        /**
         * Função auxiliar que espera um elemento aparecer na página antes de agir.
         * @param {function} selectorFn - Função que busca e retorna o elemento.
         * @param {function} actionFn - Função a ser executada quando o elemento for encontrado.
         * @param {string} description - Descrição da ação para logs no console.
         */
        function waitForElement(selectorFn, actionFn, description) {
            console.log(`Aguardando por: ${description}`);
            const interval = setInterval(() => {
                const element = selectorFn();
                if (element) {
                    clearInterval(interval);
                    console.log(`SUCESSO: Elemento "${description}" encontrado.`);
                    actionFn(element);
                }
            }, 300); // Tenta encontrar a cada 300ms
        }

        // --- Início da Cadeia de Ações ---

        // 1. Espera pelo texto "Depósito" e clica no seu elemento pai.
        waitForElement(
            () => Array.from(document.querySelectorAll('*')).find(el => el.innerText === 'Depósito'),
            (textElement) => {
                const clickableParent = textElement.parentElement;
                if (clickableParent) {
                    clickableParent.click();
                    console.log('Elemento pai de "Depósito" foi clicado.');

                    // 2. Após o clique, espera pelo campo de input.
                    waitForElement(
                        () => Array.from(document.querySelectorAll('input')).find(input => input.placeholder.includes('Mínimo') && input.placeholder.includes('Máximo')),
                        (amountInput) => {
                            amountInput.value = '10';
                            amountInput.dispatchEvent(new Event('input', { bubbles: true }));
                            amountInput.dispatchEvent(new Event('change', { bubbles: true }));
                            console.log('Valor "10" inserido no campo.');

                            // 3. Após preencher, espera pelo botão "Deposite agora".
                            waitForElement(
                                () => {
                                    const span = Array.from(document.querySelectorAll('span')).find(el => el.innerText && el.innerText.trim() === 'Deposite agora');
                                    return span ? span.closest('button') : null; // Retorna o botão clicável
                                },
                                (depositButton) => {
                                    depositButton.click();
                                    console.log('--- AUTOMAÇÃO CONCLUÍDA COM SUCESSO! ---');
                                },
                                'Botão "Deposite agora"'
                            );
                        },
                        'Campo de Input de Valor'
                    );
                } else {
                    console.error('ERRO: O elemento de texto "Depósito" foi encontrado, mas não tem um elemento pai clicável.');
                }
            },
            'Texto "Depósito"'
        );
    } else {
        console.log('Na página de perfil, mas a automação não foi iniciada (sem flag "runDepositAutomation").');
    }
})();