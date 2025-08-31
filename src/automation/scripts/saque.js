(async function() {
    'use strict';

    // --- Configurações Globais ---
    const config = {
        pin: "123123", // Senha de saque de 6 dígitos
        realName: "anderos eal", // <<-- ADICIONE SEU NOME REAL AQUI
        pixKey: "12830492215", // <<-- ADICIONE SUA CHAVE PIX (TELEFONE)
        cpf: "12830492215", // <<-- ADICIONE SEU CPF
        delayBetweenActions: 2000, // Pausa maior entre os passos principais (em ms)
        delayBetweenDigits: 100, // Pausa entre a digitação de cada número
        debug: true
    };

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
        const keyboard = document.querySelector('.ui-number-keyboard:not([style*="display: none"])');
        if (!keyboard) {
            log('ERRO: Teclado numérico virtual não foi encontrado.');
            return false;
        }
        log(`Teclado visível encontrado. Inserindo PIN: ${pin}`);
        const digitButtons = Array.from(keyboard.querySelectorAll('.ui-number-keyboard-key'));
        for (const digit of pin) {
            const buttonToClick = digitButtons.find(btn => btn.textContent.trim() === digit);
            if (!await robustClick(buttonToClick)) return false;
            await sleep(config.delayBetweenDigits);
        }
        return true;
    }

    // --- FUNÇÃO ATUALIZADA ---
    async function fillInput(placeholderText, value) {
        const targetInput = Array.from(document.querySelectorAll('input')).find(input => input.placeholder === placeholderText);
        if (targetInput) {
            // VERIFICA SE O CAMPO JÁ ESTÁ PREENCHIDO
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

    async function setWithdrawPassword() {
        log('Iniciando a definição da senha de saque...');
        const pinTargets = document.querySelectorAll('.ui-password-input__security');
        if (pinTargets.length < 2) {
            log('ERRO: Não foi possível encontrar os dois campos de senha para cadastro.');
            return;
        }

        log('Ativando o primeiro campo de senha...');
        if (!await robustClick(pinTargets[0])) return;
        if (!await enterPin(config.pin)) return;

        log(`Aguardando para o foco automático...`);
        await sleep(config.delayBetweenActions);

        log('Digitando no segundo campo...');
        if (!await robustClick(pinTargets[1])) return;
        if (!await enterPin(config.pin)) return;

        await sleep(config.delayBetweenActions);

        const confirmButton = Array.from(document.querySelectorAll('button .ui-button__text'))
            .find(span => span.textContent.trim() === 'Confirmar');

        if (confirmButton) {
            log('Clicando no botão "Confirmar"...');
            await robustClick(confirmButton.parentElement);
            log('✅ Processo de definição de senha finalizado!');
        } else {
            log('ERRO: Botão "Confirmar" da definição de senha não foi encontrado.');
        }
    }

    async function addPixAccount() {
        log('Iniciando a adição de conta PIX...');
        
        const receiveAccountTab = Array.from(document.querySelectorAll('.ui-tab')).find(el => el.textContent === 'Conta para recebimento');
        if (!await robustClick(receiveAccountTab)) return;
        await sleep(config.delayBetweenActions);

        const addAccountButton = document.getElementById('addAccountClick');
        if (!await robustClick(addAccountButton)) return;
        
        try {
            await waitForElement('.ui-number-keyboard:not([style*="display: none"])');
            log('Tela de verificação de PIN detectada.');

            if (!await enterPin(config.pin)) return;
            await sleep(config.delayBetweenActions);
            const nextButton = Array.from(document.querySelectorAll('button .ui-button__text')).find(span => span.textContent.trim() === 'Próximo');
            if (!nextButton || !await robustClick(nextButton.parentElement)) {
                log('ERRO: Botão "Próximo" não foi encontrado após o PIN.');
                return;
            }
            log('PIN verificado. Aguardando tela de dados da conta...');

            await waitForElement('.ui-select-single__content');
            log('Tela de dados PIX detectada. Preenchendo...');

            const typeSelector = document.querySelector('.ui-select-single__content');
            if (!await robustClick(typeSelector)) return;
            await sleep(500);
            const phoneOption = Array.from(document.querySelectorAll('.ui-options__option-content')).find(opt => opt.textContent.trim() === 'PHONE');
            if (!phoneOption || !await robustClick(phoneOption.parentElement)) return;
            await sleep(config.delayBetweenActions);

            if (!await fillInput('Introduza o seu nome real', config.realName)) return;
            await sleep(500);
            if (!await fillInput('Introduza a sua chave do PIX', config.pixKey)) return;
            await sleep(500);
            if (!await fillInput('Insira o número de 11 dígitos do CPF', config.cpf)) return;
            await sleep(500);

            const confirmAddButton = document.getElementById('bindWithdrawAccountNextClick');
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
            const mainWithdrawTab = await waitForElementByText('.ui-tab', 'Solicitar saque');
            log('Aba "Solicitar Saque" encontrada. Clicando para garantir o foco...');
            await robustClick(mainWithdrawTab);

            log('Aguardando o conteúdo da aba de saque carregar...');
            const tudoButton = await waitForElement('._allAmount_6ixq8_40');
            log('Botão "Tudo" encontrado. Prosseguindo com o saque.');

            if (!await robustClick(tudoButton)) return;
            await sleep(config.delayBetweenActions);

            const passwordField = document.querySelector('.ui-password-input__security');
            if (!await robustClick(passwordField)) return;
            await sleep(config.delayBetweenActions);

            if (!await enterPin(config.pin)) return;
            log('PIN de saque inserido com sucesso!');
            await sleep(config.delayBetweenActions);

            const confirmButtonSpan = Array.from(document.querySelectorAll('button .ui-button__text'))
                .find(span => span.textContent.trim() === 'Confirmar retirada');
            if (confirmButtonSpan) {
                await robustClick(confirmButtonSpan.parentElement);
                log('✅ Processo de saque finalizado!');
            } else {
                log('ERRO: Botão "Confirmar retirada" não foi encontrado.');
            }
        } catch (error) {
            log(`ERRO na função requestWithdrawal: ${error.message}`);
        }
    }


    // --- FLUXO PRINCIPAL DE EXECUÇÃO (REESTRUTURADO) ---
    async function main() {
        log('Iniciando automação...');
        const saqueButton = Array.from(document.querySelectorAll('div')).find(div => div.textContent.trim() === 'Saques');

        if (!saqueButton) return log('ERRO: Botão "Saques" não encontrado na página inicial.');
        
        await robustClick(saqueButton);
        log('Sucesso: O elemento "Saques" foi clicado.');
        await sleep(config.delayBetweenActions);

        try {
            const pinTargets = document.querySelectorAll('.ui-password-input__security');
            const addAccountTab = Array.from(document.querySelectorAll('.ui-tab')).find(el => el.textContent === 'Conta para recebimento');
            const withdrawButton = document.querySelector('._allAmount_6ixq8_40');

            if (pinTargets.length >= 2) {
                log('Cenário 1: Tela de cadastro de senha detectada.');
                await setWithdrawPassword();
                log('Senha definida. Prosseguindo para adicionar conta PIX...');
                await waitForElement('.ui-tab'); 
                await addPixAccount();
                log('Conta PIX adicionada. Prosseguindo para o saque...');
                log('Aguardando 3 segundos para a chave PIX ser processada...');
                await sleep(3000); // Atraso de 3 segundos
                await requestWithdrawal();
            
            } else if (addAccountTab) {
                log('Cenário 2: Tela de gerenciamento de conta detectada.');
                await addPixAccount();
                log('Conta PIX adicionada. Prosseguindo para o saque...');
                log('Aguardando 3 segundos para a chave PIX ser processada...');
                await sleep(3000); // Atraso de 3 segundos
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
