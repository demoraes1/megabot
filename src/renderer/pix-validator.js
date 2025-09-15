/**
 * Módulo para validação e identificação de tipos de chaves PIX
 */

class PixValidator {
    constructor() {
        this.pixTypes = {
            CPF: 'CPF',
            CNPJ: 'CNPJ',
            EMAIL: 'E-mail',
            PHONE: 'Telefone',
            RANDOM: 'Chave Aleatória'
        };
    }

    /**
     * Identifica o tipo de uma chave PIX
     * @param {string} pixKey - A chave PIX a ser validada
     * @returns {string} - O tipo da chave PIX
     */
    identifyPixKeyType(pixKey) {
        if (!pixKey || typeof pixKey !== 'string') {
            return null;
        }

        const cleanKey = pixKey.trim();

        if (this.isCPF(cleanKey)) {
            return this.pixTypes.CPF;
        }

        if (this.isCNPJ(cleanKey)) {
            return this.pixTypes.CNPJ;
        }

        if (this.isEmail(cleanKey)) {
            return this.pixTypes.EMAIL;
        }

        if (this.isPhone(cleanKey)) {
            return this.pixTypes.PHONE;
        }

        if (this.isRandomKey(cleanKey)) {
            return this.pixTypes.RANDOM;
        }

        return null; // Tipo não identificado
    }

    /**
     * Valida se é um CPF válido
     * @param {string} cpf - CPF a ser validado
     * @returns {boolean}
     */
    isCPF(cpf) {
        // Remove pontuação
        const cleanCpf = cpf.replace(/[^\d]/g, '');
        
        // Verifica se tem 11 dígitos
        if (cleanCpf.length !== 11) {
            return false;
        }

        // Verifica se todos os dígitos são iguais
        if (/^(\d)\1{10}$/.test(cleanCpf)) {
            return false;
        }

        // Validação do dígito verificador
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cleanCpf.charAt(i)) * (10 - i);
        }
        let remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cleanCpf.charAt(9))) return false;

        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cleanCpf.charAt(i)) * (11 - i);
        }
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cleanCpf.charAt(10))) return false;

        return true;
    }

    /**
     * Valida se é um CNPJ válido
     * @param {string} cnpj - CNPJ a ser validado
     * @returns {boolean}
     */
    isCNPJ(cnpj) {
        // Remove pontuação
        const cleanCnpj = cnpj.replace(/[^\d]/g, '');
        
        // Verifica se tem 14 dígitos
        if (cleanCnpj.length !== 14) {
            return false;
        }

        // Verifica se todos os dígitos são iguais
        if (/^(\d)\1{13}$/.test(cleanCnpj)) {
            return false;
        }

        // Validação do primeiro dígito verificador
        let sum = 0;
        let weight = 2;
        for (let i = 11; i >= 0; i--) {
            sum += parseInt(cleanCnpj.charAt(i)) * weight;
            weight = weight === 9 ? 2 : weight + 1;
        }
        let remainder = sum % 11;
        const digit1 = remainder < 2 ? 0 : 11 - remainder;
        if (digit1 !== parseInt(cleanCnpj.charAt(12))) return false;

        // Validação do segundo dígito verificador
        sum = 0;
        weight = 2;
        for (let i = 12; i >= 0; i--) {
            sum += parseInt(cleanCnpj.charAt(i)) * weight;
            weight = weight === 9 ? 2 : weight + 1;
        }
        remainder = sum % 11;
        const digit2 = remainder < 2 ? 0 : 11 - remainder;
        if (digit2 !== parseInt(cleanCnpj.charAt(13))) return false;

        return true;
    }

    /**
     * Valida se é um e-mail válido
     * @param {string} email - E-mail a ser validado
     * @returns {boolean}
     */
    isEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Valida se é um telefone válido
     * @param {string} phone - Telefone a ser validado
     * @returns {boolean}
     */
    isPhone(phone) {
        // Remove todos os caracteres não numéricos
        const cleanPhone = phone.replace(/[^\d]/g, '');
        
        // Telefone brasileiro: 10 ou 11 dígitos (com ou sem 9 no celular)
        // Formato: DDnnnnnnnnn ou DDnnnnnnnnn
        return cleanPhone.length === 10 || cleanPhone.length === 11;
    }

    /**
     * Valida se é uma chave aleatória (UUID)
     * @param {string} key - Chave a ser validada
     * @returns {boolean}
     */
    isRandomKey(key) {
        // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(key);
    }

    /**
     * Conta chaves PIX por tipo
     * @param {Array} pixKeys - Array de chaves PIX
     * @returns {Object} - Objeto com contadores por tipo
     */
    countPixKeysByType(pixKeys) {
        const counts = {
            [this.pixTypes.CPF]: 0,
            [this.pixTypes.CNPJ]: 0,
            [this.pixTypes.EMAIL]: 0,
            [this.pixTypes.PHONE]: 0,
            [this.pixTypes.RANDOM]: 0,
            'Inválidas': 0
        };

        if (!Array.isArray(pixKeys)) {
            return counts;
        }

        pixKeys.forEach(key => {
            const type = this.identifyPixKeyType(key);
            if (type) {
                counts[type]++;
            } else {
                counts['Inválidas']++;
            }
        });

        return counts;
    }

    /**
     * Obtém todos os tipos de chave PIX disponíveis
     * @returns {Object} - Objeto com os tipos de chave
     */
    getPixTypes() {
        return { ...this.pixTypes };
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.PixValidator = PixValidator;
}

// Exportar para Node.js se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PixValidator;
}

console.log('Módulo PixValidator carregado com sucesso');