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

    const selectors = {
        registration_keywords: ['register', 'signup', 'cadastro', 'create-account', 'join'],
        submit_keywords: ['submit', 'enviar', 'cadastrar', 'registrar', 'criar', 'confirmar', 'continuar']
    };

    const log = (message) => {
        if (config.debug) console.log(`[AutoRegistro Script] ${message}`);
    };
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // ====================================================================
    // 2. GERADOR DE DADOS E LÓGICA DE PREENCHIMENTO
    // ====================================================================
    function generateUserData() {
        const randomId = Math.floor(Math.random() * 90000 + 10000);
        const firstName = "Usuario";
        const lastName = `Teste${randomId}`;
        const fullName = `${firstName} ${lastName}`;
        const username = `${firstName.toLowerCase()}${randomId}`;
        
        return {
            name: fullName,
            username: username,
            email: `${username}@gmail.com`,
            password: `SenhaForte${randomId}!`,
            phone: `119${String(randomId).padStart(8, '0').substring(0, 8)}`
        };
    }

    async function humanTyping(element, text) {
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

    function detectFieldType(element) {
        const attrs = ['name', 'id', 'placeholder', 'type', 'aria-label'];
        const allText = attrs.map(attr => (element.getAttribute(attr) || '').toLowerCase()).join(' ');
        if (allText.includes('email')) return 'email';
        if (allText.includes('password') || allText.includes('senha')) return 'password';
        if (allText.includes('phone') || allText.includes('celular') || allText.includes('telefone')) return 'phone';
        if (allText.includes('user') || allText.includes('conta') || allText.includes('login')) return 'username';
        if (allText.includes('name') || allText.includes('nome')) return 'name';
        return 'unknown';
    }

    function findRegistrationForm() {
        const forms = Array.from(document.querySelectorAll('form, div[class*="form"], section[class*="form"]'));
        let bestCandidate = null;
        let highestScore = -1;
        forms.forEach(form => {
            const formText = (form.outerHTML || '').toLowerCase();
            let score = 0;
            selectors.registration_keywords.forEach(keyword => {
                if (formText.includes(keyword)) score += 5;
            });
            const inputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], input[type="tel"]');
            if (inputs.length >= 2) score += inputs.length * 2;
            if (score > highestScore) {
                highestScore = score;
                bestCandidate = form;
            }
        });
        return bestCandidate || document.body;
    }

    function findSubmitButton() {
        log('Procurando botão de envio...');
        // Estratégia 1: Procurar pelo ID específico (corrigido para minúsculas)
        const buttonById = document.querySelector('#insideRegisterSubmitClick');
        if (buttonById) {
            log('Botão encontrado pelo ID específico!');
            return buttonById;
        }
        log('Botão não encontrado pelo ID, tentando fallback...');
        // Estratégia 2 (Fallback): Procurar por texto
        const allButtons = Array.from(document.querySelectorAll('button, input[type="submit"], [role="button"]'));
        for (const button of allButtons) {
            const buttonText = (button.textContent || button.value || '').toLowerCase();
            if (selectors.submit_keywords.some(keyword => buttonText.includes(keyword))) {
                log(`Botão encontrado pelo texto de fallback: "${button.textContent.trim()}"`);
                return button;
            }
        }
        return null;
    }

    // ====================================================================
    // FUNÇÃO DE CLIQUE ROBUSTO (A que funcionou)
    // ====================================================================
    async function robustClick(element) {
        log(`Executando clique robusto em: <${element.tagName.toLowerCase()} id="${element.id}">`);
        try {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await sleep(500);
            log('Disparando eventos: mousedown -> mouseup -> click');
            element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
            element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
            element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            return true;
        } catch (error) {
            log(`ERRO durante o clique robusto: ${error.message}`);
            return false;
        }
    }

    // ====================================================================
    // 5. FUNÇÃO PRINCIPAL DE EXECUÇÃO
    // ====================================================================
    async function runAutoRegister() {
        log('Iniciando script de registro automático...');
        const userData = generateUserData();
        log(`Dados gerados para o usuário: ${userData.username}`);

        const form = findRegistrationForm();
        if (!form) {
            log('ERRO: Nenhum formulário de registro encontrado.');
            return;
        }
        log('Formulário de registro encontrado!');
        
        const inputs = Array.from(form.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])'));
        log(`Encontrados ${inputs.length} campos de texto para preencher.`);

        for (const input of inputs) {
            const fieldType = detectFieldType(input);
            const value = userData[fieldType];
            if (value) {
                log(`Preenchendo campo "${fieldType}"...`);
                await humanTyping(input, value);
                await sleep(config.fieldDelay);
            }
        }
        log('Preenchimento de campos de texto concluído.');
        
        const submitButton = findSubmitButton();
        if (!submitButton) {
            log('ERRO: Botão de envio não encontrado em toda a página.');
            return;
        }
        
        log(`Botão de envio localizado: "${submitButton.textContent.trim()}"`);
        log(`Aguardando ${config.submitDelay / 1000} segundos antes de clicar...`);
        await sleep(config.submitDelay);

        // Chamada da função de clique que sabemos que funciona
        await robustClick(submitButton);
        
        log('✅ Processo de registro iniciado!');
    }

    // --- Inicia a execução ---
    runAutoRegister();

})();