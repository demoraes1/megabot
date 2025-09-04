// userDataGenerator.js

const unidecode = require('unidecode');

// Variáveis globais
let faker = null;
let isInitialized = false;

// Função para inicializar o Faker de forma assíncrona
async function initializeFaker() {
    if (isInitialized) return;
    
    try {
        const { Faker, pt_BR } = await import('@faker-js/faker');
        faker = new Faker({ locale: [pt_BR] });
        
        // Pre-popula listas de nomes comuns para busca
        const PREPOPULATE_COUNT = 5000;
        const commonFirstNames = new Set();
        const commonLastNames = new Set();
        
        console.log('Pré-populando listas de nomes. Isso pode levar um momento...');
        for (let i = 0; i < PREPOPULATE_COUNT; i++) {
            commonFirstNames.add(unidecode(faker.person.firstName()));
            commonLastNames.add(unidecode(faker.person.lastName()));
        }
        console.log('Listas de nomes pré-populadas com sucesso.');
        
        // Armazena as listas globalmente
        global.commonFirstNames = commonFirstNames;
        global.commonLastNames = commonLastNames;
        
        isInitialized = true;
    } catch (error) {
        console.error('Erro ao inicializar Faker:', error);
        throw error;
    }
}


// --- Funções Auxiliares ---

const removeAccents = (text) => unidecode(text);
const cleanNick = (nick) => nick.replace(/[^a-zA-Z]/g, '').trim();

/**
 * Encontra a maior substring de um texto que corresponde a um nome em uma lista.
 * Esta é a função que permite "yolopes" ser interpretado como "Yago" e "Lopes".
 */
const findLongestMatchInList = (text, nameList) => {
    const cleanText = text.toLowerCase();
    let bestMatch = null;

    for (let i = 0; i < cleanText.length; i++) {
        for (let j = i + 1; j <= cleanText.length; j++) {
            const substring = cleanText.substring(i, j);
            const capitalizedSubstring = substring.charAt(0).toUpperCase() + substring.slice(1);

            if (nameList.has(capitalizedSubstring)) {
                if (!bestMatch || capitalizedSubstring.length > bestMatch.length) {
                    bestMatch = capitalizedSubstring;
                }
            }
        }
    }
    return bestMatch;
};


// --- Funções Principais de Geração ---

/**
 * Gera um nome completo composto a partir de um nickname.
 */
function generateComposedNameFromNick(nick) {
    const commonFirstNames = global.commonFirstNames || new Set();
    const commonLastNames = global.commonLastNames || new Set();
    
    const nickClean = cleanNick(nick);
    const nickLower = nick.toLowerCase();

    // Lógica 1: Tenta encontrar padrão "Inicial + Sobrenome" (ex: "jsilva")
    if (nickClean.length >= 2) {
        const firstLetter = nickClean[0].toUpperCase();
        const possibleSurname = nickClean.charAt(1).toUpperCase() + nickClean.slice(2);

        if (commonLastNames.has(possibleSurname)) {
            const firstNameCandidates = [...commonFirstNames].filter(name => name.startsWith(firstLetter));
            
            let firstName = firstNameCandidates.length > 0
                ? faker.helpers.arrayElement(firstNameCandidates)
                : faker.person.firstName();
            
            // Verificação de segurança
            while (firstName.toLowerCase() === nickLower) {
                console.warn(`[Ajuste]: O primeiro nome ('${firstName}') era idêntico ao nickname. Gerando um novo.`);
                firstName = faker.person.firstName();
            }
            
            const middleName = faker.person.lastName();
            return removeAccents(`${firstName} ${middleName} ${possibleSurname}`);
        }
    }

    // Lógica 2: Busca por substrings (ex: 'yolopes' -> 'Yago')
    // Se a busca falhar, o fallback é capitalizar o nickname (ex: 'master123' -> 'Master')
    let firstName = findLongestMatchInList(nickClean, commonFirstNames) || (nickClean.charAt(0).toUpperCase() + nickClean.slice(1));
    
    // ESTA É A VERIFICAÇÃO CRÍTICA:
    // Se o fallback for usado e o nome ficar idêntico ao nickname ('Master' === 'master'),
    // esta seção irá forçar a geração de um nome completamente novo e aleatório.
    while (firstName.toLowerCase() === nickLower) {
        console.warn(`[Ajuste]: O primeiro nome ('${firstName}') era idêntico ao nickname. Gerando um novo.`);
        firstName = faker.person.firstName();
    }

    const lastName = findLongestMatchInList(nickClean, commonLastNames) || faker.person.lastName();
    const middleName = faker.person.lastName();
    
    return removeAccents(`${firstName} ${middleName} ${lastName}`);
}

/**
 * Gera um nickname (username) com até 10 caracteres alfanuméricos.
 */
function generateUsername() {
    const username = faker.internet.username().replace(/[^a-zA-Z0-9]/g, '');
    return username.slice(0, 10);
}

/**
 * Gera um CPF brasileiro válido e formatado.
 */
function generateCpf() {
    const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
    
    const calcDigit = (arr) => {
        let sum = arr.reduce((acc, val, i) => acc + val * (arr.length + 1 - i), 0);
        let digit = 11 - (sum % 11);
        return digit >= 10 ? 0 : digit;
    };

    const d1 = calcDigit(n);
    const d2 = calcDigit([...n, d1]);
    const cpfArray = [...n, d1, d2];
    
    return `${cpfArray.slice(0, 3).join('')}.${cpfArray.slice(3, 6).join('')}.${cpfArray.slice(6, 9).join('')}-${cpfArray.slice(9, 11).join('')}`;
}


// --- Funções Exportadas do Módulo ---

/**
 * Gera um único usuário com nickname, nome completo e CPF.
 */
async function generateUser() {
    await initializeFaker();
    
    const username = generateUsername();
    const fullName = generateComposedNameFromNick(username);
    const cpf = generateCpf();
    
    return { username, fullName, cpf };
}

/**
 * Gera uma lista de usuários.
 */
async function generateMultipleUsers(count = 1) {
    await initializeFaker();
    
    return Array.from({ length: count }, generateUser);
}

/**
 * Gera uma senha segura com maiúsculas, minúsculas, números e símbolos.
 * @param {number} length - Comprimento da senha (padrão: 12)
 * @returns {string} Senha gerada
 */
async function generatePassword(length = 12) {
    await initializeFaker();
    
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    
    // Garante pelo menos um caractere de cada tipo
    let password = '';
    password += faker.helpers.arrayElement([...lowercase]);
    password += faker.helpers.arrayElement([...uppercase]);
    password += faker.helpers.arrayElement([...numbers]);
    password += faker.helpers.arrayElement([...symbols]);
    
    // Preenche o restante da senha
    for (let i = 4; i < length; i++) {
        password += faker.helpers.arrayElement([...allChars]);
    }
    
    // Embaralha a senha para não ter padrão previsível
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Gera números aleatórios dentro de um intervalo especificado.
 * @param {number} min - Valor mínimo (padrão: 1)
 * @param {number} max - Valor máximo (padrão: 100)
 * @param {number} count - Quantidade de números a gerar (padrão: 1)
 * @returns {number|number[]} Número único ou array de números
 */
async function generateRandomNumbers(min = 1, max = 100, count = 1) {
    await initializeFaker();
    
    if (count === 1) {
        return faker.number.int({ min, max });
    }
    
    return Array.from({ length: count }, () => faker.number.int({ min, max }));
}

/**
 * Gera um número de telefone brasileiro válido
 * @returns {Promise<string>} Telefone com 11 dígitos sem formatação
 */
async function generatePhoneNumber() {
    await initializeFaker();
    
    const ddd = await generateRandomNumbers(11, 99); // DDD válido
    const firstDigit = 9; // Celular sempre começa com 9
    const remainingDigits = [];
    for (let i = 0; i < 8; i++) {
        remainingDigits.push(await generateRandomNumbers(0, 9));
    }
    const remainingDigitsStr = remainingDigits.join('');
    
    return `${ddd.toString().padStart(2, '0')}${firstDigit}${remainingDigitsStr}`;
}

// Exportações CommonJS
module.exports = {
    generateUser,
    generateMultipleUsers,
    generatePassword,
    generateRandomNumbers,
    generatePhoneNumber
};