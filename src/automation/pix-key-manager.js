const path = require('path');
const fs = require('fs');

const profileManager = require('./profile-manager');

const APP_SETTINGS_PATH = path.join(__dirname, '../config/app-settings.json');

const TYPE_MAPPINGS = {
    PHONE: ['PHONE', 'TELEFONE', 'telefone', 'phone'],
    CPF: ['CPF', 'cpf'],
    CNPJ: ['CNPJ', 'cnpj'],
    EMAIL: ['EMAIL', 'E-MAIL', 'email', 'E-mail'],
    EVP: ['EVP', 'CHAVE ALEATORIA', 'Chave Aleatoria', 'chave aleatoria', 'aleatoria', 'ALEATORIA', 'RANDOM']
};

const TYPE_LABELS = {
    PHONE: 'Telefone',
    CPF: 'CPF',
    CNPJ: 'CNPJ',
    EMAIL: 'E-mail',
    EVP: 'Chave Aleatoria'
};

function normalizePixKeyType(value) {
    if (!value || typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    const upper = trimmed.toUpperCase();

    for (const [normalized, aliases] of Object.entries(TYPE_MAPPINGS)) {
        if (
            normalized === upper ||
            aliases.includes(trimmed) ||
            aliases.includes(upper) ||
            aliases.includes(trimmed.toLowerCase())
        ) {
            return normalized;
        }
    }

    return upper;
}

function getDefaultLabel(type) {
    return TYPE_LABELS[type] || type;
}

function loadAppSettings() {
    try {
        if (fs.existsSync(APP_SETTINGS_PATH)) {
            const raw = fs.readFileSync(APP_SETTINGS_PATH, 'utf8');
            return JSON.parse(raw);
        }
    } catch (error) {
        console.error('[pix-key-manager] Erro ao carregar app-settings:', error.message);
    }
    return { pixKeys: [] };
}

function saveAppSettings(settings) {
    try {
        fs.writeFileSync(APP_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
    } catch (error) {
        console.error('[pix-key-manager] Erro ao salvar app-settings:', error.message);
        throw error;
    }
}

function cloneKeys(keys) {
    return keys.map(key => ({ ...key }));
}

function reserveKeysFromSettings(settings, normalizedType, count) {
    const reserved = [];
    const remaining = [];

    (settings.pixKeys || []).forEach(key => {
        const keyType = normalizePixKeyType(key.tipo || key.type || key.tipo_original);
        if (keyType === normalizedType && reserved.length < count) {
            reserved.push({ ...key, keyType });
        } else {
            remaining.push(key);
        }
    });

    return { reserved, remaining };
}

async function revertProfileAssignments(assignments) {
    for (const assignment of assignments) {
        try {
            if (assignment.previousPix !== undefined) {
                profileManager.updateProfile(assignment.profileId, { pix: assignment.previousPix || null });
            }
        } catch (error) {
            console.error('[pix-key-manager] Falha ao reverter perfil', assignment.profileId, error.message);
        }
    }
}

function buildAssignedKey(reservedKey, normalizedType) {
    return {
        id: reservedKey.id,
        type: normalizedType,
        tipo: reservedKey.tipo || getDefaultLabel(normalizedType),
        chave: reservedKey.chave
    };
}

async function reserveAndAssignPixKeys(pixType, profiles) {
    const normalizedType = normalizePixKeyType(pixType);
    if (!normalizedType) {
        return { success: false, error: 'Tipo de chave PIX invalido.' };
    }

    if (!Array.isArray(profiles) || profiles.length === 0) {
        return { success: true, assignments: [], consumedKeys: [] };
    }

    const settings = loadAppSettings();
    const { reserved, remaining } = reserveKeysFromSettings(settings, normalizedType, profiles.length);

    if (reserved.length < profiles.length) {
        return { success: false, error: 'Nao ha chaves PIX suficientes do tipo selecionado para todos os navegadores ativos.' };
    }

    const successfulAssignments = [];

    try {
        for (let index = 0; index < profiles.length; index += 1) {
            const profileInfo = profiles[index];
            const reservedKey = reserved[index];
            const assignedKey = buildAssignedKey(reservedKey, normalizedType);

            const updated = profileManager.updateProfile(profileInfo.profileId, { pix: assignedKey });
            if (!updated) {
                throw new Error(`Falha ao atualizar perfil ${profileInfo.profileId}`);
            }

            successfulAssignments.push({
                profileId: profileInfo.profileId,
                navigatorId: profileInfo.navigatorId,
                assignedKey,
                previousPix: profileInfo.previousPix
            });
        }

        const updatedSettings = {
            ...settings,
            pixKeys: remaining
        };

        saveAppSettings(updatedSettings);

        return {
            success: true,
            assignments: successfulAssignments.map(({ profileId, navigatorId, assignedKey }) => ({ profileId, navigatorId, assignedKey })),
            consumedKeys: successfulAssignments.map(({ assignedKey }) => assignedKey)
        };
    } catch (error) {
        console.error('[pix-key-manager] Erro durante reserva/atribuicao de chaves PIX:', error.message);

        await revertProfileAssignments(successfulAssignments);

        try {
            const restoredSettings = loadAppSettings();
            const restoredKeys = cloneKeys(restoredSettings.pixKeys || []);
            reserved.forEach(key => {
                restoredKeys.push({ id: key.id, tipo: key.tipo || getDefaultLabel(normalizedType), chave: key.chave });
            });
            restoredSettings.pixKeys = restoredKeys;
            saveAppSettings(restoredSettings);
        } catch (restoreError) {
            console.error('[pix-key-manager] Falha ao restaurar app-settings apos erro:', restoreError.message);
        }

        return { success: false, error: 'Erro ao reservar chaves PIX. Tente novamente.' };
    }
}

module.exports = {
    reserveAndAssignPixKeys,
    normalizePixKeyType,
    getDefaultLabel
};
