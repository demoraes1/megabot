(async function() {
    'use strict';

    // ====================================================================
    // 1. CONFIGURAÇÕES E FUNÇÕES AUXILIARES
    // ====================================================================
    const config = {
        fieldDelay: 400,
        charDelay: { min: 50, max: 120 },
        submitDelay: 1000,
        debug: true
    };

    const log = (message) => {
        if (config.debug) console.log(`[AutoRegistro Script] ${message}`);
    };
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    function waitForElement(selector, timeout = 15000) {
        log(`Aguardando pelo elemento: ${selector}`);
        return new Promise((resolve, reject) => {
            const initialElement = document.querySelector(selector);
            if (initialElement) {
                log(`Elemento "${selector}" encontrado imediatamente.`);
                return resolve(initialElement);
            }

            let timeoutId = null;
            const observer = new MutationObserver((mutations, obs) => {
                const element = document.querySelector(selector);
                if (element) {
                    log(`Elemento "${selector}" foi adicionado à página.`);
                    if (timeoutId) clearTimeout(timeoutId);
                    obs.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            timeoutId = setTimeout(() => {
                log(`Tempo esgotado esperando por "${selector}".`);
                observer.disconnect();
                reject(new Error(`O elemento não apareceu em ${timeout / 1000} segundos.`));
            }, timeout);
        });
    }

    // ====================================================================
    // 2. GERADOR DE DADOS E LÓGICA DE PREENCHIMENTO
    // ====================================================================
    function generateUserData() {
        // Verificar se há dados do perfil injetados
        if (window.profileData && window.profileData.usuario) {
            log('✅ Usando dados do perfil injetado');
            return {
                account: window.profileData.usuario,
                password: window.profileData.senha,
                phone: window.profileData.telefone,
                realName: window.profileData.nome_completo,
                cpf: window.profileData.cpf
            };
        }
        
        // Fallback: gerar dados aleatórios se não houver dados do perfil
        log('⚠️ AVISO: Dados do perfil não encontrados, usando fallback');
        
        const randomId = Math.floor(Math.random() * 90000 + 10000);
        const firstName = "Usuario";
        const lastName = `Teste${randomId}`;

        // CORREÇÃO: Lógica para gerar um número de telefone com 11 dígitos
        const ddd = '11'; // Usando um DDD comum para testes
        const randomNumberPart = Math.floor(Math.random() * 90000000 + 10000000); // Gera 8 dígitos aleatórios
        const fullPhone = `${ddd}9${randomNumberPart}`; // Formato: DD + 9 + 8 dígitos = 11 dígitos

        return {
            account: `${firstName.toLowerCase()}${randomId}`,
            password: `SenhaForte${randomId}!`,
            phone: fullPhone, // Telefone agora com 11 dígitos
            realName: `${firstName} ${lastName}`,
            cpf: '000.000.000-00' // CPF placeholder para fallback
        };
    }

    async function humanTyping(element, text) {
        if (!element) {
            log(`AVISO: Tentativa de digitar em um elemento que não foi encontrado.`);
            return;
        }
        element.focus();
        element.value = '';
        await sleep(50);
        for (const char of text) {
            element.value += char;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            const delay = Math.random() * (config.charDelay.max - config.charDelay.min) + config.charDelay.min;
            await sleep(delay);
        }
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.blur();
    }
    
    async function robustClick(element) {
        if (!element) {
             log(`AVISO: Tentativa de clicar em um elemento que não foi encontrado.`);
            return false;
        }
        const elementName = element.id || element.className.split(' ')[0];
        log(`Executando clique em: <${element.tagName.toLowerCase()} class/id="${elementName}">`);
        try {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await sleep(500);
            element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            return true;
        } catch (error) {
            log(`ERRO durante o clique: ${error.message}`);
            return false;
        }
    }

    // ====================================================================
    // 3. FUNÇÃO PRINCIPAL DE EXECUÇÃO
    // ====================================================================
    async function runAutoRegister() {
        log('Iniciando script de registro automático...');

        try {
            const accountInputSelector = 'input[data-input-name="account"]';
            const accountInput = await waitForElement(accountInputSelector);
            log('Formulário de registro pronto!');

            const userData = generateUserData();
            log(`Dados gerados: ${JSON.stringify(userData)}`);

            const registrationModal = accountInput.closest('._loginRegisterDialog_1vl2x_30');
            if (!registrationModal) {
                 throw new Error('Não foi possível encontrar o contêiner do formulário principal.');
            }

            log('Preenchendo campo: Conta');
            await humanTyping(accountInput, userData.account);
            await sleep(config.fieldDelay);
            
            const passwordInput = registrationModal.querySelector('input[data-input-name="userpass"]');
            log('Preenchendo campo: Senha');
            await humanTyping(passwordInput, userData.password);
            await sleep(config.fieldDelay);

            const confirmPasswordInput = registrationModal.querySelector('input[data-input-name="confirmPassword"]');
            log('Preenchendo campo: Confirmar Senha');
            await humanTyping(confirmPasswordInput, userData.password);
            await sleep(config.fieldDelay);
            
            const phoneInput = registrationModal.querySelector('input[data-input-name="phone"]');
            log('Preenchendo campo: Celular');
            await humanTyping(phoneInput, userData.phone);
            await sleep(config.fieldDelay);

            const realNameInput = registrationModal.querySelector('input[data-input-name="realName"]');
            log('Preenchendo campo: Nome Real');
            await humanTyping(realNameInput, userData.realName);
            await sleep(config.fieldDelay);

            // Verificar se existe campo de CPF
            const cpfInput = registrationModal.querySelector('input[data-input-name="cpf"]') || 
                           registrationModal.querySelector('input[placeholder*="CPF"]') || 
                           registrationModal.querySelector('input[placeholder*="cpf"]') ||
                           registrationModal.querySelector('input[name*="cpf"]') ||
                           registrationModal.querySelector('input[id*="cpf"]');
            
            if (cpfInput) {
                log('Preenchendo campo: CPF');
                await humanTyping(cpfInput, userData.cpf);
                await sleep(config.fieldDelay);
            } else {
                log('Campo CPF não encontrado no formulário');
            }

            const agreeCheckbox = registrationModal.querySelector('input[type="checkbox"]');
            if (agreeCheckbox && !agreeCheckbox.checked) {
                 log('Marcando a caixa de "Acordo de Usuário".');
                 await robustClick(agreeCheckbox);
                 await sleep(config.fieldDelay);
            }
            
            const submitButton = registrationModal.querySelector('#insideRegisterSubmitClick');
            if (!submitButton) {
                throw new Error('Botão de envio não encontrado dentro do modal.');
            }
            
            log(`Botão de envio localizado: "${submitButton.textContent.trim()}"`);
            await sleep(config.submitDelay);
    
            await robustClick(submitButton);
            
            log('✅ Processo de registro iniciado com sucesso!');

        } catch (error) {
            log(`ERRO FATAL: ${error.message}`);
        }
    }

    runAutoRegister();

})();