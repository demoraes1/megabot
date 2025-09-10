// profile-manager.js
// Módulo responsável por gerenciar perfis de usuário com dados aleatórios

const { generateUser, generatePassword, generateRandomNumbers, generatePhoneNumber } = require('./fabrica-de-dados.js');
const fs = require('fs');
const path = require('path');

// __dirname já está disponível globalmente no Node.js CommonJS

// Caminho para a pasta profiles na raiz do sistema
const PROFILES_DIR = path.join(__dirname, '..', '..', 'profiles');
const CONFIG_FILE = path.join(PROFILES_DIR, 'config.json');

/**
 * Gera um ID único de 5 dígitos alfanuméricos
 * @returns {string} ID único de 5 caracteres
 */
function generateProfileId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}



/**
 * Cria o diretório profiles se não existir
 */
function ensureProfilesDirectory() {
    if (!fs.existsSync(PROFILES_DIR)) {
        fs.mkdirSync(PROFILES_DIR, { recursive: true });
        console.log(`Diretório profiles criado em: ${PROFILES_DIR}`);
    }
}

/**
 * Carrega a configuração existente ou cria uma nova
 * @returns {Object} Configuração carregada ou objeto vazio
 */
function loadConfig() {
    ensureProfilesDirectory();
    
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
            return JSON.parse(configData);
        } catch (error) {
            console.warn('Erro ao carregar config.json, criando novo:', error.message);
            return { profiles: [] };
        }
    }
    
    return { profiles: [] };
}

/**
 * Salva a configuração no arquivo config.json
 * @param {Object} config - Configuração a ser salva
 */
function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
        console.log('Configuração salva com sucesso em config.json');
    } catch (error) {
        console.error('Erro ao salvar configuração:', error.message);
        throw error;
    }
}

/**
 * Carrega configurações de automação do app-settings.json
 * @returns {Object} Configurações de automação
 */
function loadAutomationSettings() {
    try {
        const settingsPath = path.join(__dirname, '../config/app-settings.json');
        if (fs.existsSync(settingsPath)) {
            const settingsData = fs.readFileSync(settingsPath, 'utf8');
            const settings = JSON.parse(settingsData);
            return settings.automation || {};
        }
    } catch (error) {
        console.warn('Erro ao carregar configurações de automação:', error.message);
    }
    return {};
}

/**
 * Gera um novo perfil de usuário com dados aleatórios ou configurados
 * @returns {Object} Perfil gerado com todos os dados necessários
 */
async function generateProfile() {
    try {
        // Carregar configurações de automação
        const automationSettings = loadAutomationSettings();
        
        // Gerar dados do usuário usando a fábrica de dados
        const userData = await generateUser();
        const phone = await generatePhoneNumber();
        
        // Determinar senhas baseado nas configurações
        let password, withdrawPassword;
        
        // Se o toggle de senhas aleatórias estiver marcado, gerar ambas aleatoriamente
        if (automationSettings.randomPasswords === true) {
            password = await generatePassword(12);
            withdrawPassword = (await generateRandomNumbers(100000, 999999)).toString();
        } else {
            // Verificar cada campo individualmente
            // Senha principal: usar definida ou gerar aleatória
            if (automationSettings.password && automationSettings.password.trim() !== '') {
                password = automationSettings.password;
            } else {
                password = await generatePassword(12);
            }
            
            // Senha de saque: usar definida ou gerar aleatória
            if (automationSettings.withdrawPassword && automationSettings.withdrawPassword.trim() !== '') {
                // Validar se tem 6 dígitos numéricos
                if (/^\d{6}$/.test(automationSettings.withdrawPassword)) {
                    withdrawPassword = automationSettings.withdrawPassword;
                } else {
                    console.warn('Senha de saque inválida (deve ter 6 dígitos), gerando nova:', automationSettings.withdrawPassword);
                    withdrawPassword = (await generateRandomNumbers(100000, 999999)).toString();
                }
            } else {
                withdrawPassword = (await generateRandomNumbers(100000, 999999)).toString();
            }
        }
        
        const profileId = generateProfileId();
        const profile = {
            id: `profile_${profileId}`,
            url: null,
            usuario: userData.username,
            nome_completo: userData.fullName,
            senha: password,
            senha_saque: withdrawPassword,
            telefone: phone,
            cpf: userData.cpf,
            proxy: null,
            pix: null,
            created_at: new Date().toISOString()
        };
        
        console.log('Perfil gerado:', {
            id: profile.id,
            usuario: profile.usuario,
            nome_completo: profile.nome_completo,
            telefone: profile.telefone,
            cpf: profile.cpf,
            usingRandomPasswords: automationSettings.randomPasswords
        });
        
        return profile;
    } catch (error) {
        console.error('Erro ao gerar perfil:', error.message);
        throw error;
    }
}

/**
 * Adiciona um novo perfil à configuração
 * @param {Object} profile - Perfil a ser adicionado
 * @returns {Object} Configuração atualizada
 */
function addProfile(profile) {
    const config = loadConfig();
    
    // Verificar se já existe um perfil com o mesmo ID
    const existingProfile = config.profiles.find(p => p.id === profile.id);
    if (existingProfile) {
        console.warn(`Perfil com ID ${profile.id} já existe, gerando novo ID`);
        const newProfileId = generateProfileId();
        profile.id = `profile_${newProfileId}`;
    }
    
    config.profiles.push(profile);
    saveConfig(config);
    
    console.log(`Perfil ${profile.id} adicionado com sucesso`);
    return config;
}

/**
 * Cria e adiciona um novo perfil automaticamente
 * @returns {Object} Perfil criado
 */
async function createNewProfile() {
    const profile = await generateProfile();
    addProfile(profile);
    return profile;
}

/**
 * Obtém todos os perfis salvos
 * @returns {Array} Lista de perfis
 */
function getAllProfiles() {
    const config = loadConfig();
    return config.profiles || [];
}

/**
 * Obtém um perfil específico pelo ID
 * @param {string} profileId - ID do perfil
 * @returns {Object|null} Perfil encontrado ou null
 */
function getProfileById(profileId) {
    const config = loadConfig();
    return config.profiles.find(p => p.id === profileId) || null;
}

/**
 * Remove um perfil pelo ID
 * @param {string} profileId - ID do perfil a ser removido
 * @returns {boolean} True se removido com sucesso
 */
function removeProfile(profileId) {
    const config = loadConfig();
    const initialLength = config.profiles.length;
    
    config.profiles = config.profiles.filter(p => p.id !== profileId);
    
    if (config.profiles.length < initialLength) {
        saveConfig(config);
        console.log(`Perfil ${profileId} removido com sucesso`);
        return true;
    }
    
    console.warn(`Perfil ${profileId} não encontrado`);
    return false;
}

/**
 * Atualiza campos específicos de um perfil
 * @param {string} profileId - ID do perfil a ser atualizado
 * @param {Object} updates - Objeto com os campos a serem atualizados
 * @returns {boolean} True se atualizado com sucesso
 */
function updateProfile(profileId, updates) {
    const config = loadConfig();
    const profileIndex = config.profiles.findIndex(p => p.id === profileId);
    
    if (profileIndex === -1) {
        console.warn(`Perfil ${profileId} não encontrado para atualização`);
        return false;
    }
    
    // Atualizar os campos fornecidos
    Object.assign(config.profiles[profileIndex], updates);
    
    saveConfig(config);
    console.log(`Perfil ${profileId} atualizado com sucesso`);
    return true;
}

/**
 * Sincroniza IDs dos perfis no config.json com as pastas físicas existentes
 */
function syncProfilesWithFolders() {
    try {
        const config = loadConfig();
        
        // Obter todas as pastas de perfil existentes
        const profileFolders = fs.readdirSync(PROFILES_DIR)
            .filter(item => {
                const itemPath = path.join(PROFILES_DIR, item);
                return fs.statSync(itemPath).isDirectory() && item.startsWith('profile_');
            });
        
        console.log(`Pastas de perfil encontradas: ${profileFolders.join(', ')}`);
        
        // Verificar se há perfis no config.json sem pasta correspondente
        const updatedProfiles = [];
        let hasChanges = false;
        
        for (const profile of config.profiles) {
            const profileFolderExists = profileFolders.includes(profile.id);
            
            if (!profileFolderExists) {
                // Procurar uma pasta órfã para associar a este perfil
                const orphanFolder = profileFolders.find(folder => 
                    !config.profiles.some(p => p.id === folder)
                );
                
                if (orphanFolder) {
                    console.log(`Sincronizando perfil ${profile.id} -> ${orphanFolder}`);
                    profile.id = orphanFolder;
                    hasChanges = true;
                }
            }
            
            updatedProfiles.push(profile);
        }
        
        if (hasChanges) {
            config.profiles = updatedProfiles;
            saveConfig(config);
            console.log('Perfis sincronizados com as pastas físicas');
        }
        
        return config;
    } catch (error) {
        console.error('Erro ao sincronizar perfis com pastas:', error.message);
        return loadConfig();
    }
}

/**
 * Inicializa o sistema de perfis (cria diretório e arquivo se necessário)
 */
function initializeProfileSystem() {
    ensureProfilesDirectory();
    
    const config = loadConfig();
    if (!config.profiles) {
        config.profiles = [];
        saveConfig(config);
    }
    
    // Sincronizar perfis com pastas existentes
    syncProfilesWithFolders();
    
    console.log('Sistema de perfis inicializado');
    console.log(`Perfis salvos: ${config.profiles.length}`);
    console.log(`Arquivo de configuração: ${CONFIG_FILE}`);
    
    return config;
}

// Exportar todas as funções
module.exports = {
    generateProfile,
    addProfile,
    createNewProfile,
    getAllProfiles,
    getProfileById,
    removeProfile,
    updateProfile,
    initializeProfileSystem,
    PROFILES_DIR,
    CONFIG_FILE,
    ensureProfilesDirectory,
    loadConfig,
    saveConfig,
    syncProfilesWithFolders
};