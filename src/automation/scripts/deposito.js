// --- SCRIPT FINAL (OPÇÃO 4 - AJUSTE HÍBRIDO) ---
// Injetar este script APENAS UMA VEZ na página inicial.

(function() {
    'use strict';
    console.log('Iniciando script com Setter Nativo e Config Híbrida (v8.2)...');

    // =================================================================================
    // --- ÁREA DE CONFIGURAÇÃO ---
    // =================================================================================
    const config = {
        depositPage: {
            urlPathIdentifier: '/home/mine'
        },
        // **REVERTIDO:** Configuração do botão "Perfil" voltou a ser a genérica, que estava funcionando.
        profileButton: {
            textToFind: 'Perfil',
            textElementSelector: 'footer [role="tab"] span',
            clickableParentSelector: '[role="tab"]'
        },
        // **MANTIDO:** Configuração específica para o botão "Depósito", conforme a imagem.
        depositTrigger: {
            textToFind: 'Depósito',
            textElementSelector: 'p[class*="_label_"]',
            clickableParentSelector: 'div[class*="_navItem_"]'
        },
        amountInput: {
            fieldSelector: 'input',
            placeholderKeywords: ['Mínimo', 'Máximo']
        },
        submitButton: {
            textToFind: 'Deposite agora',
            textElementSelector: 'span',
            clickableParentSelector: 'button'
        },
        delays: {
            afterProfileClickMs: 1000,
            beforeTypingMs: 500,
            beforeSubmitMs: 500
        }
    };
    // =================================================================================
    // --- FIM DA ÁREA DE CONFIGURAÇÃO ---
    // =================================================================================


    function generateRandomNumbers(min, max, count = 1) {
        if (min > max) { throw new Error('O valor mínimo não pode ser maior que o máximo'); }
        const numbers = [];
        for (let i = 0; i < count; i++) {
            numbers.push(Math.floor(Math.random() * (max - min + 1)) + min);
        }
        return count === 1 ? numbers[0] : numbers;
    }

    const depositConfig = window.megabotConfig;
    if (!depositConfig || !depositConfig.depositMin || !depositConfig.depositMax) {
        console.error('Configurações de depósito (depositMin, depositMax) não encontradas em window.megabotConfig');
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
        }, 500);
    }

    function runDepositAutomation() {
        console.log('Iniciando a sequência de automação de depósito...');
        // Lógica NOVA e específica para o botão DEPÓSITO
        waitForElement(
            () => {
                const textElement = Array.from(document.querySelectorAll(config.depositTrigger.textElementSelector)).find(el => el.innerText === config.depositTrigger.textToFind);
                return textElement ? textElement.closest(config.depositTrigger.clickableParentSelector) : null;
            },
            (clickableElement) => {
                clickableElement.click();
                console.log(`Ação: Clicou em "${config.depositTrigger.textToFind}".`);
                waitForElement(
                    () => Array.from(document.querySelectorAll(config.amountInput.fieldSelector)).find(input =>
                        config.amountInput.placeholderKeywords.every(kw => input.placeholder.includes(kw))
                    ),
                    (amountInput) => {
                        console.log(`Aguardando ${config.delays.beforeTypingMs}ms antes de preencher o valor...`);
                        setTimeout(() => {
                            const randomValue = generateRandomNumbers(depositConfig.depositMin, depositConfig.depositMax);
                            console.log(`Ação: Inserindo o valor aleatório "${randomValue}".`);

                            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                            nativeInputValueSetter.call(amountInput, randomValue.toString());
                            amountInput.dispatchEvent(new Event('input', { bubbles: true }));

                            console.log(`Aguardando ${config.delays.beforeSubmitMs}ms antes de clicar no botão...`);
                            setTimeout(() => {
                                waitForElement(
                                    () => {
                                        const span = Array.from(document.querySelectorAll(config.submitButton.textElementSelector)).find(el => el.innerText && el.innerText.trim() === config.submitButton.textToFind);
                                        return span ? span.closest(config.submitButton.clickableParentSelector) : null;
                                    },
                                    (depositButton) => {
                                        depositButton.click();
                                        console.log('--- AUTOMAÇÃO CONCLUÍDA COM SUCESSO! ---');
                                    },
                                    `Botão "${config.submitButton.textToFind}"`
                                );
                            }, config.delays.beforeSubmitMs);
                        }, config.delays.beforeTypingMs);
                    },
                    'Campo de Input de Valor'
                );
            },
            `Botão/Texto "${config.depositTrigger.textToFind}" na página de perfil`
        );
    }

    // Ponto de entrada do script
    if (window.location.pathname.includes(config.depositPage.urlPathIdentifier)) {
        runDepositAutomation();
    } else {
        // Lógica ANTIGA e genérica para o botão PERFIL
        waitForElement(
            () => Array.from(document.querySelectorAll(config.profileButton.textElementSelector)).find(span => span.textContent.trim() === config.profileButton.textToFind),
            (perfilSpan) => {
                const clickableButton = perfilSpan.closest(config.profileButton.clickableParentSelector);
                if (clickableButton) {
                    clickableButton.click();
                    console.log(`Ação: Clicou em "${config.profileButton.textToFind}". Aguardando ${config.delays.afterProfileClickMs}ms para a página carregar...`);
                    
                    setTimeout(() => {
                        runDepositAutomation();
                    }, config.delays.afterProfileClickMs);

                } else { console.error(`ERRO: Texto "${config.profileButton.textToFind}" encontrado, mas o botão clicável pai não.`); }
            },
            `Botão "${config.profileButton.textToFind}" na barra inferior`
        );
    }
})();




