// --- SCRIPT FINAL (OPÇÃO 1 COM ATRASO ANTES DE DIGITAR) ---
// Injetar este script APENAS UMA VEZ na página inicial.

(function() {
    'use strict';
    console.log('Iniciando script com Setter Nativo e Atraso (v7 - Valores Aleatórios)...');
    
    // Função para gerar números aleatórios (copiada de fabrica-de-dados.js)
    function generateRandomNumbers(min, max, count = 1) {
        if (min > max) {
            throw new Error('O valor mínimo não pode ser maior que o máximo');
        }
        
        const numbers = [];
        for (let i = 0; i < count; i++) {
            const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
            numbers.push(randomNumber);
        }
        
        return count === 1 ? numbers[0] : numbers;
    }
    
    // Obter configurações de depósito
    const depositConfig = window.megabotConfig;
    if (!depositConfig || !depositConfig.depositMin || !depositConfig.depositMax) {
        console.error('Configurações de depósito não encontradas em window.megabotConfig');
        return;
    }
    console.log('Configurações de depósito:', depositConfig);

    function waitForElement(selectorFn, actionFn, description) {
        console.log(`[Aguardando]: ${description}`);
        const interval = setInterval(() => {
            const element = selectorFn();
            if (element) {
                clearInterval(interval);
                console.log(`[Sucesso]: Elemento "${description}" encontrado.`);
                actionFn(element);
            }
        }, 300);
    }

    function runDepositAutomation() {
        console.log('Iniciando a sequência de automação de depósito...');
        waitForElement(
            () => Array.from(document.querySelectorAll('*')).find(el => el.innerText === 'Depósito'),
            (textElement) => {
                const clickableParent = textElement.parentElement;
                if (clickableParent) {
                    clickableParent.click();
                    console.log('Ação: Clicou em "Depósito".');
                    waitForElement(
                        () => Array.from(document.querySelectorAll('input')).find(input => input.placeholder.includes('Mínimo') && input.placeholder.includes('Máximo')),
                        (amountInput) => {
                            
                            // --- ATRASO ADICIONADO AQUI ---
                            console.log('Aguardando 1000ms antes de preencher o valor...');
                            setTimeout(() => {
                                // --- TÉCNICA DO SETTER NATIVO COM VALOR ALEATÓRIO ---
                                const randomValue = generateRandomNumbers(depositConfig.depositMin, depositConfig.depositMax);
                                console.log(`Ação: Usando setter nativo para inserir o valor aleatório "${randomValue}" (entre ${depositConfig.depositMin} e ${depositConfig.depositMax}).`);
                                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                                nativeInputValueSetter.call(amountInput, randomValue.toString());

                                const event = new Event('input', { bubbles: true });
                                amountInput.dispatchEvent(event);
                                
                                // Delay de 500ms antes de clicar no botão
                                console.log('Aguardando 1000ms antes de clicar no botão...');
                                setTimeout(() => {
                                    waitForElement(
                                        () => {
                                            const span = Array.from(document.querySelectorAll('span')).find(el => el.innerText && el.innerText.trim() === 'Deposite agora');
                                            return span ? span.closest('button') : null;
                                        },
                                        (depositButton) => {
                                            depositButton.click();
                                            console.log('--- AUTOMAÇÃO CONCLUÍDA COM SUCESSO! ---');
                                        },
                                        'Botão "Deposite agora"'
                                    );
                                }, 1000);

                            }, 500); // Fim do atraso de 500ms

                        },
                        'Campo de Input de Valor'
                    );
                } else { console.error('ERRO: O elemento de texto "Depósito" foi encontrado, mas não tem um elemento pai clicável.'); }
            },
            'Botão/Texto "Depósito" na página de perfil'
        );
    }

    if (window.location.pathname.includes('/home/mine')) {
        runDepositAutomation();
    } else {
        waitForElement(
            () => Array.from(document.querySelectorAll('span.tabbar-text')).find(span => span.textContent.trim() === 'Perfil'),
            (perfilSpan) => {
                const clickableButton = perfilSpan.closest('.ui-tab');
                if (clickableButton) {
                    clickableButton.click();
                    runDepositAutomation();
                } else { console.error('ERRO: Texto "Perfil" encontrado, mas o botão clicável pai não.'); }
            },
            'Botão "Perfil" na barra inferior'
        );
    }
})();