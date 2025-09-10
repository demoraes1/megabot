(async function() {
    'use strict';

    // =================================================================================
    // --- ÁREA DE CONFIGURAÇÃO ---
    // Altere os valores abaixo para adaptar o script.
    // =================================================================================
    const config = {
        // --- Dados do Usuário ---
        userData: {
            pin: "123123",        // Senha de saque de 6 dígitos
            realName: "anderos eal", // <<-- ADICIONE SEU NOME REAL AQUI
            pixKey: "12830492215",  // <<-- ADICIONE SUA CHAVE PIX (TELEFONE)
            cpf: "12830492215",    // <<-- ADICIONE SEU CPF
        },

        // --- Seletores e Textos da Interface ---
        selectors: {
            // Botão de navegação para o Perfil (adicionado)
            profileButton: {
                textToFind: 'Perfil',
                textElementSelector: 'span.tabbar-text',
                clickableParentSelector: '.ui-tab'
            },
            // Tela principal
            mainScreen: {
                withdrawPageButtonText: 'Saques',
            },
            // Teclado virtual de PIN
            pinPad: {
                keyboard: '.ui-number-keyboard:not([style*="display: none"])',
                keys: '.ui-number-keyboard-key',
            },
            // Campos de senha
            passwordField: '.ui-password-input__security',
            // Botões genéricos
            buttonTextSpan: 'button .ui-button__text',
            // Abas de navegação
            tab: '.ui-tab',
            // Tela de Definir Senha de Saque
            setPinScreen: {
                confirmButtonText: 'Confirmar',
            },
            // Tela de Adicionar Conta PIX
            addPixScreen: {
                tabText: 'Conta para recebimento',
                addButtonId: 'addAccountClick',
                nextButtonText: 'Próximo',
                pixTypeSelector: '.ui-select-single__content',
                pixTypeOption: '.ui-options__option-content',
                pixTypeOptionText: 'PHONE',
                confirmAddButtonId: 'bindWithdrawAccountNextClick',
                placeholderName: 'Introduza o seu nome real',
                placeholderPixKey: 'Introduza a sua chave do PIX',
                placeholderCpf: 'Insira o número de 11 dígitos do CPF',
            },
            // Tela de Solicitar Saque
            withdrawScreen: {
                tabText: 'Solicitar saque',
                allAmountButton: '[class*="_allAmount_"]', // Seletor robusto para classe gerada
                confirmButtonText: 'Confirmar retirada',
            }
        },
        
        // --- Configurações de Comportamento ---
        delays: {
            betweenActions: 2000,
            betweenDigits: 100,
            afterProfileClick: 2500, // Adicionado delay para a página de perfil carregar
            afterPixAdd: 3000,
        },
        debug: true
    };
    // =================================================================================
    // --- FIM DA ÁREA DE CONFIGURAÇÃO ---
    // =================================================================================


    // --- Funções Auxiliares (Consolidadas) ---
    const log = (message) => {
        if (config.debug) console.log(`[Script de Saque Completo] ${message}`);
    };
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    async function robustClick(element) {
        if (!element) {
            log('ERRO: Elemento para clicar não foi encontrado.');
            return false;
        }
        const elementName = element.textContent.trim() || element.id || element.className;
        log(`Clicando em: "${elementName}"`);
        element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        await sleep(50);
        element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        return true;
    }

    async function enterPin(pin) {
        await sleep(500);
        const keyboard = document.querySelector(config.selectors.pinPad.keyboard);
        if (!keyboard) {
            log('ERRO: Teclado numérico virtual não foi encontrado.');
            return false;
        }
        log(`Teclado visível encontrado. Inserindo PIN...`);
        const digitButtons = Array.from(keyboard.querySelectorAll(config.selectors.pinPad.keys));
        for (const digit of pin) {
            const buttonToClick = digitButtons.find(btn => btn.textContent.trim() === digit);
            if (!await robustClick(buttonToClick)) return false;
            await sleep(config.delays.betweenDigits);
        }
        return true;
    }

    async function fillInput(placeholderText, value) {
        const targetInput = Array.from(document.querySelectorAll('input')).find(input => input.placeholder === placeholderText);
        if (targetInput) {
            if (!targetInput.value || targetInput.value.trim() === '') {
                log(`Preenchendo "${placeholderText}"...`);
                targetInput.value = value;
                targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                targetInput.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                log(`Campo "${placeholderText}" já está preenchido. Ignorando.`);
            }
            return true;
        }
        log(`ERRO: Campo com placeholder "${placeholderText}" não foi encontrado.`);
        return false;
    }
    
    async function waitForElement(selector, timeout = 7000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const element = document.querySelector(selector);
            if (element) return element;
            await sleep(250);
        }
        throw new Error(`Elemento ${selector} não encontrado no tempo limite.`);
    }
    
    async function waitForElementByText(selector, text, timeout = 7000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const elements = Array.from(document.querySelectorAll(selector));
            const targetElement = elements.find(el => el.textContent.trim() === text);
            if (targetElement) return targetElement;
            await sleep(250);
        }
        throw new Error(`Elemento '${selector}' com texto '${text}' não encontrado no tempo limite.`);
    }


    // --- Funções de Etapa ---

    async function navigateToProfile() {
        log('Procurando pelo botão de Perfil na página inicial...');
        try {
            const perfilSpan = await waitForElementByText(
                config.selectors.profileButton.textElementSelector,
                config.selectors.profileButton.textToFind
            );
            
            const clickableButton = perfilSpan.closest(config.selectors.profileButton.clickableParentSelector);
            if (!clickableButton) {
                log(`ERRO: O elemento de texto "Perfil" foi encontrado, mas seu contêiner clicável não.`);
                return false;
            }

            await robustClick(clickableButton);
            log(`Botão de Perfil clicado. Aguardando ${config.delays.afterProfileClick / 1000}s para a navegação...`);
            await sleep(config.delays.afterProfileClick);
            return true;

        } catch (error) {
            log(`ERRO ao tentar navegar para a tela de Perfil: ${error.message}`);
            return false;
        }
    }

    async function setWithdrawPassword() {
        log('Iniciando a definição da senha de saque...');
        const pinTargets = document.querySelectorAll(config.selectors.passwordField);
        if (pinTargets.length < 2) {
            log('ERRO: Não foi possível encontrar os dois campos de senha para cadastro.');
            return;
        }

        log('Ativando o primeiro campo de senha...');
        if (!await robustClick(pinTargets[0])) return;
        if (!await enterPin(config.userData.pin)) return;

        await sleep(config.delays.betweenActions);

        log('Digitando no segundo campo...');
        if (!await robustClick(pinTargets[1])) return;
        if (!await enterPin(config.userData.pin)) return;

        await sleep(config.delays.betweenActions);

        const confirmButton = Array.from(document.querySelectorAll(config.selectors.buttonTextSpan))
            .find(span => span.textContent.trim() === config.selectors.setPinScreen.confirmButtonText);

        if (confirmButton) {
            log('Clicando no botão "Confirmar"...');
            await robustClick(confirmButton.parentElement);
            log('✅ Processo de definição de senha finalizado!');
        } else {
            log(`ERRO: Botão "${config.selectors.setPinScreen.confirmButtonText}" da definição de senha não foi encontrado.`);
        }
    }

    async function addPixAccount() {
        log('Iniciando a adição de conta PIX...');
        
        const receiveAccountTab = Array.from(document.querySelectorAll(config.selectors.tab)).find(el => el.textContent === config.selectors.addPixScreen.tabText);
        if (!await robustClick(receiveAccountTab)) return;
        await sleep(config.delays.betweenActions);

        const addAccountButton = document.getElementById(config.selectors.addPixScreen.addButtonId);
        if (!await robustClick(addAccountButton)) return;
        
        try {
            await waitForElement(config.selectors.pinPad.keyboard);
            log('Tela de verificação de PIN detectada.');

            if (!await enterPin(config.userData.pin)) return;
            await sleep(config.delays.betweenActions);
            const nextButton = Array.from(document.querySelectorAll(config.selectors.buttonTextSpan)).find(span => span.textContent.trim() === config.selectors.addPixScreen.nextButtonText);
            if (!nextButton || !await robustClick(nextButton.parentElement)) {
                log(`ERRO: Botão "${config.selectors.addPixScreen.nextButtonText}" não foi encontrado após o PIN.`);
                return;
            }
            log('PIN verificado. Aguardando tela de dados da conta...');

            await waitForElement(config.selectors.addPixScreen.pixTypeSelector);
            log('Tela de dados PIX detectada. Preenchendo...');

            const typeSelector = document.querySelector(config.selectors.addPixScreen.pixTypeSelector);
            if (!await robustClick(typeSelector)) return;
            await sleep(500);
            const phoneOption = Array.from(document.querySelectorAll(config.selectors.addPixScreen.pixTypeOption)).find(opt => opt.textContent.trim() === config.selectors.addPixScreen.pixTypeOptionText);
            if (!phoneOption || !await robustClick(phoneOption.parentElement)) return;
            await sleep(config.delays.betweenActions);

            if (!await fillInput(config.selectors.addPixScreen.placeholderName, config.userData.realName)) return;
            await sleep(500);
            if (!await fillInput(config.selectors.addPixScreen.placeholderPixKey, config.userData.pixKey)) return;
            await sleep(500);
            if (!await fillInput(config.selectors.addPixScreen.placeholderCpf, config.userData.cpf)) return;
            await sleep(500);

            const confirmAddButton = document.getElementById(config.selectors.addPixScreen.confirmAddButtonId);
            if (await robustClick(confirmAddButton)) {
                 log('Dados da conta PIX preenchidos e confirmados.');
            }
        } catch (error) {
            log(`ERRO durante a adição da conta PIX: ${error.message}`);
        }
    }

    async function requestWithdrawal() {
        log('Iniciando o processo de solicitação de saque...');
        
        try {
            const mainWithdrawTab = await waitForElementByText(config.selectors.tab, config.selectors.withdrawScreen.tabText);
            log('Aba "Solicitar Saque" encontrada. Clicando para garantir o foco...');
            await robustClick(mainWithdrawTab);

            log('Aguardando o conteúdo da aba de saque carregar...');
            const tudoButton = await waitForElement(config.selectors.withdrawScreen.allAmountButton);
            log('Botão "Tudo" encontrado. Prosseguindo com o saque.');

            if (!await robustClick(tudoButton)) return;
            await sleep(config.delays.betweenActions);

            const passwordField = document.querySelector(config.selectors.passwordField);
            if (!await robustClick(passwordField)) return;
            await sleep(config.delays.betweenActions);

            if (!await enterPin(config.userData.pin)) return;
            log('PIN de saque inserido com sucesso!');
            await sleep(config.delays.betweenActions);

            const confirmButtonSpan = Array.from(document.querySelectorAll(config.selectors.buttonTextSpan))
                .find(span => span.textContent.trim() === config.selectors.withdrawScreen.confirmButtonText);
            if (confirmButtonSpan) {
                await robustClick(confirmButtonSpan.parentElement);
                log('✅ Processo de saque finalizado!');
            } else {
                log(`ERRO: Botão "${config.selectors.withdrawScreen.confirmButtonText}" não foi encontrado.`);
            }
        } catch (error) {
            log(`ERRO na função requestWithdrawal: ${error.message}`);
        }
    }


    // --- FLUXO PRINCIPAL DE EXECUÇÃO ---
    async function main() {
        log('Iniciando automação...');
        
        // Etapa 1: Navegar para a tela de Perfil a partir da tela inicial
        if (!await navigateToProfile()) {
            log('Falha ao navegar para a tela de Perfil. O script será encerrado.');
            return;
        }
        
        // Etapa 2: Clicar no botão "Saques" dentro da tela de Perfil
        const saqueButton = Array.from(document.querySelectorAll('div')).find(div => div.textContent.trim() === config.selectors.mainScreen.withdrawPageButtonText);

        if (!saqueButton) return log(`ERRO: Botão "${config.selectors.mainScreen.withdrawPageButtonText}" não encontrado na página de Perfil.`);
        
        await robustClick(saqueButton);
        log(`Sucesso: O elemento "${config.selectors.mainScreen.withdrawPageButtonText}" foi clicado.`);
        await sleep(config.delays.betweenActions);

        // Etapa 3: Identificar o cenário correto (cadastro de senha, add de conta ou saque direto)
        try {
            const pinTargets = document.querySelectorAll(config.selectors.passwordField);
            const addAccountTab = Array.from(document.querySelectorAll(config.selectors.tab)).find(el => el.textContent === config.selectors.addPixScreen.tabText);
            const withdrawButton = document.querySelector(config.selectors.withdrawScreen.allAmountButton);

            if (pinTargets.length >= 2) {
                log('Cenário 1: Tela de cadastro de senha detectada.');
                await setWithdrawPassword();
                await waitForElement(config.selectors.tab); 
                await addPixAccount();
                log(`Aguardando ${config.delays.afterPixAdd / 1000} segundos para a chave PIX ser processada...`);
                await sleep(config.delays.afterPixAdd);
                await requestWithdrawal();
            
            } else if (addAccountTab) {
                log('Cenário 2: Tela de gerenciamento de conta detectada.');
                await addPixAccount();
                log(`Aguardando ${config.delays.afterPixAdd / 1000} segundos para a chave PIX ser processada...`);
                await sleep(config.delays.afterPixAdd);
                await requestWithdrawal();
            
            } else if (withdrawButton) {
                log('Cenário 3: Tela de saque direto detectada.');
                await requestWithdrawal();
            } else {
                log('ERRO: Não foi possível identificar a tela após clicar em "Saques". O script será encerrado.');
            }
        } catch (error) {
            log(`ERRO no fluxo principal: ${error.message}`);
        }
    }

    main();

})();