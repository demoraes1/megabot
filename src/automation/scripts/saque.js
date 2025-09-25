(async function() {
    'use strict';

    // =================================================================================
    // --- ÁREA DE CONFIGURAÇÃO ---
    // Altere os valores abaixo para adaptar o script.
    // =================================================================================
    // Função para obter dados do usuário (dinâmico via window.profileData)
    function getUserData() {
        function getPixKeyFromConfig() {
            const pixConfig = window.megabotConfig?.pixKeys;
            if (Array.isArray(pixConfig) && pixConfig.length > 0) {
                const randomEntry = pixConfig[Math.floor(Math.random() * pixConfig.length)];
                if (typeof randomEntry === 'string') {
                    return randomEntry;
                }
                if (randomEntry && typeof randomEntry === 'object') {
                    return randomEntry.chave || null;
                }
            }
            return null;
        }

        if (window.profileData) {
            const assignedPix = window.profileData.pix;
            const assignedPixValue = typeof assignedPix === 'object' ? assignedPix.chave : assignedPix;
            const assignedPixType = typeof assignedPix === 'object' ? (assignedPix.type || assignedPix.tipo) : null;

            return {
                pin: window.profileData.senha_saque || "",
                realName: window.profileData.nome_completo || "",
                pixKey: assignedPixValue || getPixKeyFromConfig(),
                pixType: assignedPixType || window.megabotConfig?.pixKeyType || 'PHONE',
                cpf: window.profileData.cpf || ""
            };
        }

        return {
            pin: "",
            realName: "",
            pixKey: getPixKeyFromConfig(),
            pixType: window.megabotConfig?.pixKeyType || 'PHONE',
            cpf: ""
        };
    }


    function getPixTypeOptionText(type) {
        const mapping = {
            PHONE: 'Telefone',
            CPF: 'CPF',
            CNPJ: 'CNPJ',
            EMAIL: 'E-mail',
            EVP: 'Chave Aleatoria'
        };
        return mapping[type] || type;
    }
    function normalizePixText(value) {
        if (!value) {
            return '';
        }
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .replace(/\s+/g, ' ')
            .trim();
    }


    const userData = getUserData();

    const config = {
        // --- Dados do Usuário (agora dinâmicos) ---
        userData: userData,

        // --- Seletores e Textos da Interface ---
        selectors: {
            // Navegação
            profileButton: {
                textToFind: 'Perfil',
                textElementSelector: 'footer [role="tab"] span',
                clickableParentSelector: '[role="tab"]'
            },
            mainScreen: {
                withdrawPageButtonText: 'Saques',
            },

            // Elementos Genéricos
            pinPad: {
                keyboard: '.ui-number-keyboard:not([style*="display: none"])',
                keys: '.ui-number-keyboard-key',
            },
            passwordField: '.ui-password-input__security',
            buttonTextSpan: 'button .ui-button__text',
            tab: '[role="tab"]',
            
            // Cenário 1: Definir Senha de Saque
            setPinScreen: {
                confirmButtonText: 'Confirmar',
            },

            // Cenário 2: Adicionar Conta
            addPixScreen: {
                formContainerSelector: 'section[data-route-for-scroll="withdraw"]', 
                addAccountKeyword: 'Adicionar Conta para Saque',
                addAccountButtonId: 'addAccountClick',
                nextButtonText: 'Próximo',
                pixTypeSelector: '.ui-select-single__content',
                pixTypeOption: '.ui-options__option-content',
                pixTypeOptionText: getPixTypeOptionText(userData?.pixType || window.megabotConfig?.pixKeyType || 'PHONE'),
                confirmAddButtonId: 'bindWithdrawAccountNextClick',
                placeholderName: 'Introduza o seu nome real',
                placeholderPixKey: 'Introduza a sua chave do PIX',
                placeholderCpf: 'Insira o número de 11 dígitos do CPF',
            },

            // Cenário 3: Solicitar Saque
            withdrawScreen: {
                tabText: 'Solicitar saque',
                accountSelector: '.ui-select-single__content', // O campo que mostra a conta selecionada
                accountOption: 'div.ui-options__option',    // A opção de conta clicável na lista
                pixKeyword: 'PIX',                          // Palavra-chave para encontrar a conta certa
                allAmountButton: 'span[class*="_allAmount_"]',
                confirmButtonText: 'Confirmar retirada',
            }
        },
        
        // --- Configurações de Comportamento ---
        delays: {
            betweenActions: 1000,
            betweenDigits: 100,
            afterProfileClick: 2500,
            afterPixAdd: 3000, // Delay para a interface atualizar após adicionar a conta
        },
        debug: true
    };
    // =================================================================================
    // --- FIM DA ÁREA DE CONFIGURAÇÃO ---
    // =================================================================================


    // --- Funções Auxiliares ---
    const log = (message) => {
        if (config.debug) console.log(`[Script de Saque] ${message}`);
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
        log('Procurando pelo botão de Perfil...');
        try {
            const perfilSpan = await waitForElementByText(
                config.selectors.profileButton.textElementSelector,
                config.selectors.profileButton.textToFind
            );
            const clickableButton = perfilSpan.closest(config.selectors.profileButton.clickableParentSelector);
            if (!clickableButton) {
                log(`ERRO: Contêiner clicável do "Perfil" não foi encontrado.`);
                return false;
            }
            await robustClick(clickableButton);
            log(`Botão de Perfil clicado. Aguardando ${config.delays.afterProfileClick / 1000}s...`);
            await sleep(config.delays.afterProfileClick);
            return true;
        } catch (error) {
            log(`ERRO ao navegar para o Perfil: ${error.message}`);
            return false;
        }
    }

    async function setWithdrawPassword() {
        log('Iniciando a definição da senha de saque...');
        const pinTargets = document.querySelectorAll(config.selectors.passwordField);
        if (pinTargets.length < 2) {
            log('ERRO: Campos de senha para cadastro não encontrados.');
            return false;
        }
        log('Preenchendo o primeiro campo de senha...');
        if (!await robustClick(pinTargets[0]) || !await enterPin(config.userData.pin)) return false;
        await sleep(config.delays.betweenActions);
        log('Preenchendo o segundo campo de senha...');
        if (!await robustClick(pinTargets[1]) || !await enterPin(config.userData.pin)) return false;
        await sleep(config.delays.betweenActions);
        const confirmButton = Array.from(document.querySelectorAll(config.selectors.buttonTextSpan))
            .find(span => span.textContent.trim() === config.selectors.setPinScreen.confirmButtonText);
        if (confirmButton) {
            log('Clicando em "Confirmar"...');
            await robustClick(confirmButton.parentElement);
            log('✅ Definição de senha finalizada!');
            return true;
        } else {
            log(`ERRO: Botão "${config.selectors.setPinScreen.confirmButtonText}" não encontrado.`);
            return false;
        }
    }
    
    async function addPixAccount() {
        log('Iniciando processo de adição de conta...');
        if (!config.userData.pixKey) {
            log('ERRO: Nenhuma chave PIX disponível para preencher o cadastro.');
            return false;
        }
        const addButton = document.getElementById(config.selectors.addPixScreen.addAccountButtonId);
        if (!await robustClick(addButton)) return false;

        try {
            await waitForElement(config.selectors.pinPad.keyboard);
            log('Tela de verificação de PIN detectada.');

            if (!await enterPin(config.userData.pin)) return false;
            await sleep(config.delays.betweenActions);

            const nextButton = Array.from(document.querySelectorAll(config.selectors.buttonTextSpan))
                .find(span => span.textContent.trim() === config.selectors.addPixScreen.nextButtonText);
            if (!nextButton || !await robustClick(nextButton.parentElement)) {
                log(`ERRO: Botão "${config.selectors.addPixScreen.nextButtonText}" não encontrado após o PIN.`);
                return false;
            }
            log('PIN verificado. Aguardando tela de dados da conta...');

            await waitForElement(config.selectors.addPixScreen.pixTypeSelector);
            log('Tela de dados PIX detectada. Preenchendo...');

            const typeSelector = document.querySelector(config.selectors.addPixScreen.pixTypeSelector);
            if (!await robustClick(typeSelector)) return false;
            await sleep(500);

            const expectedPixTypeText = getPixTypeOptionText(userData?.pixType || window.megabotConfig?.pixKeyType || 'PHONE');
            const expectedNormalized = normalizePixText(expectedPixTypeText);
            log(`Selecionando o tipo PIX "${expectedPixTypeText}".`);
            const userTypeNormalized = normalizePixText(userData?.pixType || '');
            const pixOptions = Array.from(document.querySelectorAll(config.selectors.addPixScreen.pixTypeOption));
            const targetOption = pixOptions.find(opt => normalizePixText(opt.textContent) === expectedNormalized)
                || pixOptions.find(opt => normalizePixText(opt.textContent).includes(expectedNormalized))
                || (userTypeNormalized ? pixOptions.find(opt => normalizePixText(opt.textContent).includes(userTypeNormalized)) : null);

            if (!targetOption || !await robustClick(targetOption.parentElement || targetOption)) {
                log(`ERRO: Opção de tipo PIX correspondente a "${expectedPixTypeText}" não foi encontrada.`);
                return false;
            }
            log(`Tipo PIX "${expectedPixTypeText}" selecionado.`);
            await sleep(config.delays.betweenActions);

            if (!await fillInput(config.selectors.addPixScreen.placeholderName, config.userData.realName)) return false;
            await sleep(500);
            if (!await fillInput(config.selectors.addPixScreen.placeholderPixKey, config.userData.pixKey)) return false;
            await sleep(500);
            if (!await fillInput(config.selectors.addPixScreen.placeholderCpf, config.userData.cpf)) return false;
            await sleep(500);

            const confirmAddButton = document.getElementById(config.selectors.addPixScreen.confirmAddButtonId);
            if (await robustClick(confirmAddButton)) {
                 log('✅ Dados da conta PIX preenchidos e confirmados.');
                 return true;
            }
            return false;
        } catch (error) {
            log(`ERRO durante a adição da conta PIX: ${error.message}`);
            return false;
        }
    }

    async function requestWithdrawal() {
        log('Iniciando o processo de solicitação de saque...');
        try {
            // Garante que a aba "Solicitar saque" está ativa
            const mainWithdrawTab = Array.from(document.querySelectorAll(config.selectors.tab))
                .find(el => el.textContent.trim() === config.selectors.withdrawScreen.tabText);
            if (mainWithdrawTab && !mainWithdrawTab.classList.contains('ui-tab--active')) {
                log('Clicando na aba "Solicitar saque" para garantir o foco.');
                await robustClick(mainWithdrawTab);
                await sleep(config.delays.betweenActions);
            }

            // Garante que a conta PIX correta está selecionada
            const accountSelector = await waitForElement(config.selectors.withdrawScreen.accountSelector);
            if (!accountSelector.textContent.includes(config.selectors.withdrawScreen.pixKeyword)) {
                log('Conta PIX não está selecionada. Abrindo opções...');
                await robustClick(accountSelector);
                await sleep(config.delays.betweenActions);

                const pixOptions = Array.from(document.querySelectorAll(config.selectors.withdrawScreen.accountOption));
                const targetAccount = pixOptions.find(opt => opt.textContent.includes(config.selectors.withdrawScreen.pixKeyword));

                if (targetAccount) {
                    log('Conta PIX encontrada na lista. Selecionando...');
                    await robustClick(targetAccount);
                    await sleep(config.delays.betweenActions);
                } else {
                    throw new Error('Nenhuma conta PIX encontrada na lista de opções.');
                }
            } else {
                log('Conta PIX já está selecionada.');
            }

            // Continua com o fluxo de saque
            const allAmountButton = await waitForElement(config.selectors.withdrawScreen.allAmountButton);
            if (!await robustClick(allAmountButton)) return;
            await sleep(config.delays.betweenActions);

            const passwordField = document.querySelector(config.selectors.passwordField);
            if (!await robustClick(passwordField)) return;
            await sleep(config.delays.betweenActions);

            if (!await enterPin(config.userData.pin)) return;
            log('PIN de saque inserido.');
            await sleep(config.delays.betweenActions);

            const confirmButton = Array.from(document.querySelectorAll(config.selectors.buttonTextSpan))
                .find(span => span.textContent.trim() === config.selectors.withdrawScreen.confirmButtonText);
            if (confirmButton) {
                log('Clicando em "Confirmar retirada"...');
                await robustClick(confirmButton.parentElement);
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
        if (!await navigateToProfile()) return;
        
        const saqueButton = Array.from(document.querySelectorAll('div')).find(div => div.textContent.trim() === config.selectors.mainScreen.withdrawPageButtonText);
        if (!saqueButton) {
            log(`ERRO: Botão "${config.selectors.mainScreen.withdrawPageButtonText}" não encontrado.`);
            return;
        }
        await robustClick(saqueButton);
        log('Botão "Saques" clicado.');
        await sleep(config.delays.betweenActions);

        // Identificar o cenário correto
        try {
            const pinTargets = document.querySelectorAll(config.selectors.passwordField);
            if (pinTargets.length >= 2) {
                log('Cenário 1: Cadastro de senha de saque.');
                if (await setWithdrawPassword()) {
                    log('Senha cadastrada. Aguardando transição para a tela de adicionar conta...');
                    await waitForElement(`#${config.selectors.addPixScreen.addAccountButtonId}`);
                    if (await addPixAccount()) {
                        log('Conta adicionada. Prosseguindo para o saque...');
                        await sleep(config.delays.afterPixAdd);
                        await requestWithdrawal();
                    }
                }
                return; 
            }

            const formContainer = document.querySelector(config.selectors.addPixScreen.formContainerSelector);
            if (formContainer) {
                if (formContainer.textContent.includes(config.selectors.addPixScreen.addAccountKeyword)) {
                    log('Cenário 2: Adicionar conta PIX.');
                    if (await addPixAccount()) {
                        log('Conta adicionada. Prosseguindo para o saque...');
                        await sleep(config.delays.afterPixAdd);
                        await requestWithdrawal();
                    }
                } else {
                    log('Cenário 3: Saque direto.');
                    await requestWithdrawal();
                }
            } else {
                 log('ERRO: Nenhum cenário de saque foi identificado.');
            }
        } catch (error) {
            log(`ERRO no fluxo principal: ${error.message}`);
        }
    }

    main();

})();


