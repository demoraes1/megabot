const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const { spawn } = require('child_process');

/**
 * Módulo para gerenciar o download e instalação do Chromium
 */
class ChromiumDownloader {
    constructor() {
        this.projectRoot = path.join(__dirname, '..', '..');
        this.browserDir = path.join(this.projectRoot, 'browser');
        this.chromeDir = path.join(this.browserDir, 'Chrome-bin');
        this.chromeExePath = path.join(this.chromeDir, 'chrome.exe');
        this.tempFilePath = path.join(this.browserDir, 'chrome.7z');
    }

    /**
     * Busca informações da versão mais recente do Chromium
     * @returns {Promise<{version: string, downloadUrl: string}>}
     */
    async getLatestReleaseInfo() {
        try {
            console.log('[ChromiumDownloader] Buscando versão mais recente...');
            
            // Usar a API do GitHub para obter a versão mais recente
            const https = require('https');
            const apiUrl = 'https://api.github.com/repos/Hibbiki/chromium-win64/releases/latest';
            
            const response = await new Promise((resolve, reject) => {
                const req = https.get(apiUrl, {
                    headers: {
                        'User-Agent': 'ChromiumDownloader/1.0'
                    }
                }, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            resolve(JSON.parse(data));
                        } catch (error) {
                            reject(new Error('Erro ao analisar resposta da API'));
                        }
                    });
                });
                
                req.on('error', reject);
                req.setTimeout(10000, () => {
                    req.destroy();
                    reject(new Error('Timeout na requisição da API'));
                });
            });
            
            if (!response.tag_name || !response.assets) {
                throw new Error('Resposta da API inválida');
            }
            
            // Procurar pelo arquivo chrome.7z nos assets
            const chromeAsset = response.assets.find(asset => asset.name === 'chrome.7z');
            if (!chromeAsset) {
                throw new Error('Arquivo chrome.7z não encontrado na versão mais recente');
            }
            
            const version = response.tag_name;
            const downloadUrl = chromeAsset.browser_download_url;
            
            console.log(`[ChromiumDownloader] Versão mais recente encontrada: ${version}`);
            
            return {
                version,
                downloadUrl
            };
            
        } catch (error) {
            console.warn(`[ChromiumDownloader] Erro ao buscar versão mais recente: ${error.message}`);
            console.log('[ChromiumDownloader] Usando versão de fallback...');
            
            // Fallback para versão conhecida
            const version = 'v139.0.7258.155-r1477651';
            const downloadUrl = `https://github.com/Hibbiki/chromium-win64/releases/download/${version}/chrome.7z`;
            
            return {
                version,
                downloadUrl
            };
        }
    }

    /**
     * Verifica se a pasta browser e o executável do Chrome existem
     * @returns {Promise<boolean>}
     */
    async checkBrowserExists() {
        try {
            await fs.access(this.chromeExePath);
            console.log('[ChromiumDownloader] Chrome encontrado:', this.chromeExePath);
            return true;
        } catch (error) {
            console.log('[ChromiumDownloader] Chrome não encontrado, será necessário fazer download');
            return false;
        }
    }

    /**
     * Obtém a versão do Chrome instalado
     * @returns {Promise<string|null>}
     */
    async getInstalledVersion() {
        try {
            // Verificar se existe uma pasta de versão no Chrome-bin
            const chromeBinContents = await fs.readdir(this.chromeDir);
            const versionFolder = chromeBinContents.find(item => 
                item.match(/^\d+\.\d+\.\d+\.\d+$/)
            );
            
            if (versionFolder) {
                console.log('[ChromiumDownloader] Versão instalada encontrada:', versionFolder);
                return versionFolder;
            }
            
            console.log('[ChromiumDownloader] Não foi possível determinar a versão instalada');
            return null;
        } catch (error) {
            console.log('[ChromiumDownloader] Erro ao verificar versão instalada:', error.message);
            return null;
        }
    }

    /**
     * Compara versões para verificar se há uma atualização disponível
     * @param {string} installedVersion - Versão instalada (ex: "139.0.7258.155")
     * @param {string} latestVersion - Versão mais recente (ex: "v140.0.7259.156-r1477652")
     * @returns {boolean}
     */
    compareVersions(installedVersion, latestVersion) {
        if (!installedVersion) return true; // Se não há versão instalada, precisa instalar
        
        // Extrair apenas os números da versão mais recente (remover 'v' e sufixo '-r...')
        const latestVersionNumbers = latestVersion.replace(/^v/, '').split('-')[0];
        
        console.log('[ChromiumDownloader] Comparando versões:');
        console.log('[ChromiumDownloader] Instalada:', installedVersion);
        console.log('[ChromiumDownloader] Mais recente:', latestVersionNumbers);
        
        // Comparar as versões
        const installed = installedVersion.split('.').map(Number);
        const latest = latestVersionNumbers.split('.').map(Number);
        
        for (let i = 0; i < Math.max(installed.length, latest.length); i++) {
            const installedPart = installed[i] || 0;
            const latestPart = latest[i] || 0;
            
            if (latestPart > installedPart) {
                console.log('[ChromiumDownloader] Nova versão disponível!');
                return true;
            } else if (latestPart < installedPart) {
                console.log('[ChromiumDownloader] Versão instalada é mais recente que a disponível');
                return false;
            }
        }
        
        console.log('[ChromiumDownloader] Versão instalada está atualizada');
        return false;
    }

    /**
     * Remove a versão antiga do Chrome
     * @returns {Promise<void>}
     */
    async removeOldVersion() {
        try {
            console.log('[ChromiumDownloader] Removendo versão antiga...');
            
            // Verificar se a pasta Chrome-bin existe
            try {
                await fs.access(this.chromeDir);
            } catch (error) {
                console.log('[ChromiumDownloader] Pasta Chrome-bin não existe, nada para remover');
                return;
            }
            
            // Remover toda a pasta Chrome-bin
            await fs.rm(this.chromeDir, { recursive: true, force: true });
            console.log('[ChromiumDownloader] Versão antiga removida com sucesso');
            
        } catch (error) {
            console.error('[ChromiumDownloader] Erro ao remover versão antiga:', error);
            throw error;
        }
    }

    /**
     * Verifica se há atualizações disponíveis
     * @returns {Promise<{needsUpdate: boolean, installedVersion: string|null, latestVersion: string}>}
     */
    async checkForUpdates() {
        try {
            console.log('[ChromiumDownloader] Verificando atualizações...');
            
            const [installedVersion, latestReleaseInfo] = await Promise.all([
                this.getInstalledVersion(),
                this.getLatestReleaseInfo()
            ]);
            
            const needsUpdate = this.compareVersions(installedVersion, latestReleaseInfo.version);
            
            return {
                needsUpdate,
                installedVersion,
                latestVersion: latestReleaseInfo.version
            };
            
        } catch (error) {
            console.error('[ChromiumDownloader] Erro ao verificar atualizações:', error);
            throw error;
        }
    }

    /**
     * Cria a pasta browser se não existir
     * @returns {Promise<void>}
     */
    async createBrowserDirectory() {
        try {
            await fs.mkdir(this.browserDir, { recursive: true });
            console.log('[ChromiumDownloader] Pasta browser criada:', this.browserDir);
        } catch (error) {
            console.error('[ChromiumDownloader] Erro ao criar pasta browser:', error);
            throw error;
        }
    }

    /**
     * Faz o download com retry logic
     * @param {string} url - URL para download
     * @param {Function} progressCallback - Callback para atualizações de progresso
     * @param {Object} releaseInfo - Informações da versão
     * @param {number} maxRetries - Número máximo de tentativas
     * @returns {Promise<void>}
     */
    async downloadWithRetry(url, progressCallback, releaseInfo, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[ChromiumDownloader] Tentativa ${attempt}/${maxRetries} de download...`);
                
                if (progressCallback && attempt > 1) {
                    progressCallback({
                        percent: 30,
                        message: `Tentativa ${attempt}/${maxRetries} de download...`,
                        speed: null,
                        version: releaseInfo.version
                    });
                }
                
                await this.performDownload(url, progressCallback, releaseInfo);
                console.log('[ChromiumDownloader] Download concluído com sucesso!');
                return; // Sucesso, sair do loop
                
            } catch (error) {
                lastError = error;
                console.warn(`[ChromiumDownloader] Tentativa ${attempt} falhou:`, error.message);
                
                if (attempt < maxRetries) {
                    const waitTime = Math.pow(2, attempt) * 1000; // Backoff exponencial
                    console.log(`[ChromiumDownloader] Aguardando ${waitTime/1000}s antes da próxima tentativa...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                } else {
                    console.error('[ChromiumDownloader] Todas as tentativas de download falharam');
                    throw lastError;
                }
            }
        }
    }
    
    /**
     * Executa o download real
     * @param {string} downloadUrl - URL para download
     * @param {Function} progressCallback - Callback para atualizações de progresso
     * @param {Object} releaseInfo - Informações da versão
     * @returns {Promise<void>}
     */
    async performDownload(downloadUrl, progressCallback, releaseInfo) {
        return new Promise((resolve, reject) => {
            const file = require('fs').createWriteStream(this.tempFilePath);
            let startTime = Date.now();
            
            const request = https.get(downloadUrl, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    // Seguir redirecionamento
                    const redirectUrl = response.headers.location;
                    console.log('[ChromiumDownloader] Redirecionando para:', redirectUrl);
                    
                    // Fechar o arquivo atual e tentar novamente com a URL de redirecionamento
                    file.destroy();
                    request.destroy();
                    this.performDownload(redirectUrl, progressCallback, releaseInfo)
                        .then(resolve)
                        .catch(reject);
                    return;
                }
                
                if (response.statusCode !== 200) {
                    file.close();
                    reject(new Error(`Erro HTTP: ${response.statusCode}`));
                    return;
                }
                
                const totalSize = parseInt(response.headers['content-length'], 10);
                let downloadedSize = 0;
                
                console.log(`[ChromiumDownloader] Tamanho do arquivo: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
                
                response.pipe(file);
                
                response.on('data', (chunk) => {
                    downloadedSize += chunk.length;
                    const progress = ((downloadedSize / totalSize) * 100).toFixed(1);
                    const elapsed = (Date.now() - startTime) / 1000;
                    const speed = downloadedSize / elapsed;
                    const speedText = speed > 1024 * 1024 ? 
                        `${(speed / 1024 / 1024).toFixed(1)} MB/s` : 
                        `${(speed / 1024).toFixed(1)} KB/s`;
                    
                    process.stdout.write(`\r[ChromiumDownloader] Progresso: ${progress}%`);
                    
                    // Enviar progresso via callback
                    if (progressCallback) {
                        const adjustedProgress = 30 + (parseFloat(progress) * 0.55); // 30% a 85%
                        progressCallback({
                            percent: Math.round(adjustedProgress),
                            message: `Baixando Chrome... ${progress}%`,
                            speed: speedText,
                            version: releaseInfo.version
                        });
                    }
                });
                
                response.on('end', () => {
                    console.log('\n[ChromiumDownloader] Download concluído!');
                });
                
                response.on('error', (error) => {
                    console.error('\n[ChromiumDownloader] Erro no download:', error);
                    file.close();
                    reject(error);
                });
            });
            
            file.on('finish', () => {
                file.close();
                resolve();
            });
            
            file.on('error', (error) => {
                console.error('[ChromiumDownloader] Erro ao salvar arquivo:', error);
                reject(error);
            });
            
            request.on('error', (error) => {
                console.error('[ChromiumDownloader] Erro na requisição:', error);
                file.close();
                reject(error);
            });
            
            // Timeout para requisições muito longas
            request.setTimeout(300000, () => { // 5 minutos
                request.abort();
                file.close();
                reject(new Error('Timeout no download - conexão muito lenta'));
            });
        });
    }

    /**
     * Verifica se há espaço suficiente em disco
     * @param {number} requiredSpace - Espaço necessário em bytes
     * @param {Function} progressCallback - Callback para atualizações de progresso
     * @returns {Promise<boolean>}
     */
    async checkDiskSpace(requiredSpace, progressCallback = null) {
        try {
            if (progressCallback) {
                progressCallback({
                    percent: 5,
                    message: 'Verificando espaço em disco...',
                    speed: null,
                    version: null
                });
            }
            
            const { spawn } = require('child_process');
            
            return new Promise((resolve, reject) => {
                // Usar PowerShell para verificar espaço livre
                const psScript = `Get-WmiObject -Class Win32_LogicalDisk | Where-Object {$_.DeviceID -eq "${path.parse(this.browserDir).root}"} | Select-Object FreeSpace`;
                
                const psProcess = spawn('powershell.exe', [
                    '-NoProfile',
                    '-Command', psScript
                ]);
                
                let output = '';
                
                psProcess.stdout.on('data', (data) => {
                    output += data.toString();
                });
                
                psProcess.on('close', (code) => {
                    if (code === 0) {
                        try {
                            // Extrair o valor de FreeSpace do output
                            const match = output.match(/\d+/);
                            if (match) {
                                const freeSpace = parseInt(match[0]);
                                const freeSpaceGB = Math.floor(freeSpace / (1024 * 1024 * 1024));
                                const requiredGB = Math.ceil(requiredSpace / (1024 * 1024 * 1024));
                                
                                console.log(`[ChromiumDownloader] Espaço livre: ${freeSpaceGB}GB, Necessário: ${requiredGB}GB`);
                                
                                if (freeSpace < requiredSpace) {
                                    reject(new Error(`Espaço insuficiente. Disponível: ${freeSpaceGB}GB, Necessário: ${requiredGB}GB`));
                                } else {
                                    resolve(true);
                                }
                            } else {
                                resolve(true); // Se não conseguir verificar, assume que há espaço
                            }
                        } catch (error) {
                            resolve(true); // Em caso de erro, assume que há espaço
                        }
                    } else {
                        resolve(true); // Em caso de erro, assume que há espaço
                    }
                });
            });
            
        } catch (error) {
            console.warn('[ChromiumDownloader] Erro ao verificar espaço em disco:', error.message);
            return true; // Em caso de erro, assume que há espaço
        }
    }

    /**
     * Valida a integridade do arquivo baixado
     * @param {Function} progressCallback - Callback para atualizações de progresso
     * @returns {Promise<boolean>}
     */
    async validateDownloadedFile(progressCallback = null) {
        try {
            if (progressCallback) {
                progressCallback({
                    percent: 75,
                    message: 'Validando arquivo baixado...',
                    speed: null,
                    version: null
                });
            }
            
            const stats = await fs.stat(this.tempFilePath);
            console.log(`[ChromiumDownloader] Tamanho do arquivo baixado: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
            
            // Apenas verifica se o arquivo existe (sem validação de tamanho)
            if (!stats.isFile()) {
                throw new Error('Arquivo não encontrado');
            }
            
            // Validação de magic bytes removida conforme solicitado
            
            console.log('[ChromiumDownloader] Validação do arquivo concluída com sucesso');
            return true;
            
        } catch (error) {
            console.error('[ChromiumDownloader] Falha na validação do arquivo:', error.message);
            throw new Error(`Arquivo inválido: ${error.message}`);
        }
    }

    /**
     * Faz o download do arquivo Chromium
     * @returns {Promise<void>}
     */
    async downloadChromium(progressCallback = null) {
        // Obter informações da versão mais recente
        const releaseInfo = await this.getLatestReleaseInfo();
        const downloadUrl = releaseInfo.downloadUrl;
        
        console.log('[ChromiumDownloader] Iniciando download do Chromium...');
        console.log('[ChromiumDownloader] Versão:', releaseInfo.version);
        console.log('[ChromiumDownloader] URL:', downloadUrl);
        
        // Usar o novo método com retry logic
        await this.downloadWithRetry(downloadUrl, progressCallback, releaseInfo);
        
        // Validar o arquivo baixado
        await this.validateDownloadedFile(progressCallback);
    }

    /**
     * Extrai o arquivo 7z usando 7-Zip ou PowerShell
     * @param {Function} progressCallback - Callback para atualizações de progresso
     * @returns {Promise<void>}
     */
    async extractChromium(progressCallback = null) {
        console.log('[ChromiumDownloader] Iniciando extração do arquivo 7z...');
        
        if (progressCallback) {
            progressCallback({
                percent: 85,
                message: 'Extraindo Chrome...',
                speed: null,
                version: null
            });
        }
        
        const extractionMethods = [
            { name: '7-Zip', method: () => this.extractWith7Zip(progressCallback) },
            { name: 'tar', method: () => this.extractWithTar(progressCallback) },
            { name: 'PowerShell', method: () => this.extractWithPowerShell(progressCallback) }
        ];
        
        let lastError;
        
        for (const { name, method } of extractionMethods) {
            try {
                console.log(`[ChromiumDownloader] Tentando extração com ${name}...`);
                await method();
                console.log(`[ChromiumDownloader] Extração com ${name} concluída com sucesso.`);
                return;
            } catch (error) {
                lastError = error;
                console.warn(`[ChromiumDownloader] Extração com ${name} falhou:`, error.message);
                
                if (progressCallback) {
                    progressCallback({
                        percent: 85,
                        message: `Tentando método alternativo de extração...`,
                        speed: null,
                        version: null
                    });
                }
            }
        }
        
        // Se todos os métodos falharam
        console.error('[ChromiumDownloader] Todos os métodos de extração falharam');
        throw new Error(`Falha na extração: ${lastError?.message || 'Métodos de extração indisponíveis'}`);
    }

    
    /**
     * Extrai usando 7-Zip
     * @param {Function} progressCallback - Callback para atualizações de progresso
     * @returns {Promise<void>}
     */
    async extractWith7Zip(progressCallback = null) {
        const possiblePaths = [
            '7z',
            'C:\\Program Files\\7-Zip\\7z.exe',
            'C:\\Program Files (x86)\\7-Zip\\7z.exe'
        ];
        
        for (const zipPath of possiblePaths) {
            try {
                await new Promise((resolve, reject) => {
                    const process = spawn(zipPath, ['x', this.tempFilePath, `-o${this.browserDir}`, '-y'], {
                        stdio: ['pipe', 'pipe', 'pipe']
                    });
                    
                    let extractionProgress = 85;
                    
                    process.stdout.on('data', (data) => {
                        const output = data.toString().trim();
                        console.log('[ChromiumDownloader] 7z:', output);
                        
                        // Simular progresso da extração
                        if (progressCallback && output.includes('%')) {
                            extractionProgress = Math.min(95, extractionProgress + 2);
                            progressCallback({
                                percent: extractionProgress,
                                message: 'Extraindo Chrome...',
                                speed: null,
                                version: null
                            });
                        }
                    });
                    
                    process.stderr.on('data', (data) => {
                        console.error('[ChromiumDownloader] 7z erro:', data.toString().trim());
                    });
                    
                    process.on('close', (code) => {
                        if (code === 0) {
                            if (progressCallback) {
                                progressCallback({
                                    percent: 95,
                                    message: 'Extração concluída!',
                                    speed: null,
                                    version: null
                                });
                            }
                            resolve();
                        } else {
                            reject(new Error(`7-Zip falhou com código ${code}`));
                        }
                    });
                    
                    process.on('error', (error) => {
                        reject(error);
                    });
                });
                return; // Sucesso, sair do loop
            } catch (error) {
                continue; // Tentar próximo caminho
            }
        }
        
        throw new Error('7-Zip não encontrado em nenhum caminho padrão');
    }
    
    /**
     * Extrai usando tar (Windows 10+)
     * @param {Function} progressCallback - Callback para atualizações de progresso
     * @returns {Promise<void>}
     */
    async extractWithTar(progressCallback = null) {
        return new Promise((resolve, reject) => {
            console.log('[ChromiumDownloader] Tentando extrair com tar...');
            
            const tarProcess = spawn('tar', ['-xf', this.tempFilePath, '-C', this.browserDir], {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let extractionProgress = 85;
            
            tarProcess.stdout.on('data', (data) => {
                const output = data.toString().trim();
                console.log('[ChromiumDownloader] tar:', output);
                
                // Simular progresso da extração
                if (progressCallback) {
                    extractionProgress = Math.min(95, extractionProgress + 1);
                    progressCallback({
                        percent: extractionProgress,
                        message: 'Extraindo Chrome...',
                        speed: null,
                        version: null
                    });
                }
            });
            
            tarProcess.stderr.on('data', (data) => {
                console.error('[ChromiumDownloader] tar erro:', data.toString().trim());
            });
            
            tarProcess.on('close', (code) => {
                if (code === 0) {
                    if (progressCallback) {
                        progressCallback({
                            percent: 95,
                            message: 'Extração concluída!',
                            speed: null,
                            version: null
                        });
                    }
                    resolve();
                } else {
                    reject(new Error(`tar falhou com código: ${code}`));
                }
            });
            
            tarProcess.on('error', (error) => {
                reject(new Error(`Erro ao executar tar: ${error.message}`));
            });
        });
    }
    
    /**
     * Extrai usando PowerShell com módulo 7Zip4PowerShell
     * @param {Function} progressCallback - Callback para atualizações de progresso
     * @returns {Promise<void>}
     */
    async extractWithPowerShell(progressCallback = null) {
        return new Promise((resolve, reject) => {
            console.log('[ChromiumDownloader] Tentando extrair com PowerShell e módulo 7Zip4PowerShell...');
            
            const psScript = `
                # Verifica se o módulo 7Zip4PowerShell está disponível
                if (-not (Get-Module -ListAvailable -Name 7Zip4PowerShell)) {
                    Write-Host "Instalando módulo 7Zip4PowerShell..."
                    try {
                        Install-Module -Name 7Zip4PowerShell -Force -Scope CurrentUser -AllowClobber
                        Write-Host "Módulo instalado com sucesso."
                    } catch {
                        Write-Error "Falha ao instalar módulo: $($_.Exception.Message)"
                        exit 1
                    }
                }
                
                try {
                    Import-Module 7Zip4PowerShell
                    Write-Host "Extraindo arquivo 7z..."
                    Expand-7Zip -ArchiveFileName "${this.tempFilePath.replace(/\\/g, '\\\\')}" -TargetPath "${this.browserDir.replace(/\\/g, '\\\\')}"
                    Write-Host "Extração concluída com sucesso"
                } catch {
                    Write-Error "Erro na extração: $($_.Exception.Message)"
                    exit 1
                }
            `;
            
            const extractProcess = spawn('powershell.exe', [
                '-NoProfile',
                '-ExecutionPolicy', 'Bypass',
                '-Command', psScript
            ]);
            
            extractProcess.stdout.on('data', (data) => {
                const output = data.toString().trim();
                if (output) {
                    console.log('[ChromiumDownloader]', output);
                    
                    if (progressCallback) {
                        let percent = 90;
                        let message = 'Extraindo com PowerShell...';
                        
                        if (output.includes('Instalando módulo')) {
                            percent = 87;
                            message = 'Instalando módulo PowerShell...';
                        } else if (output.includes('Extraindo arquivo')) {
                            percent = 95;
                            message = 'Extraindo arquivos...';
                        } else if (output.includes('concluída com sucesso')) {
                            percent = 100;
                            message = 'Extração concluída!';
                        }
                        
                        progressCallback({
                            percent,
                            message,
                            speed: null,
                            version: null
                        });
                    }
                }
            });
            
            extractProcess.stderr.on('data', (data) => {
                const errorMsg = data.toString().trim();
                if (errorMsg && !errorMsg.includes('WARNING')) {
                    console.error('[ChromiumDownloader] PowerShell erro:', errorMsg);
                }
            });
            
            extractProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('[ChromiumDownloader] Extração com PowerShell concluída!');
                    resolve();
                } else {
                    reject(new Error(`PowerShell falhou com código: ${code}`));
                }
            });
            
            extractProcess.on('error', (error) => {
                reject(new Error(`Erro ao executar PowerShell: ${error.message}`));
            });
        });
    }

    /**
     * Remove o arquivo compactado após a extração
     * @returns {Promise<void>}
     */
    async cleanupTempFile() {
        try {
            await fs.unlink(this.tempFilePath);
            console.log('[ChromiumDownloader] Arquivo temporário removido:', this.tempFilePath);
        } catch (error) {
            console.warn('[ChromiumDownloader] Erro ao remover arquivo temporário:', error.message);
        }
    }

    /**
     * Garante que o Chromium esteja disponível, fazendo download se necessário
     * @param {Function} progressCallback - Callback para receber atualizações de progresso
     * @returns {Promise<string>} Caminho para o executável do Chrome
     */
    async ensureChromiumAvailable(progressCallback = null) {
        try {
            // Callback helper para enviar progresso
            const sendProgress = (percent, message, speed = null, version = null) => {
                if (progressCallback) {
                    progressCallback({ percent, message, speed, version });
                }
            };
            
            sendProgress(0, 'Verificando instalação do Chrome...');
            
            // Verificar espaço em disco (estimativa: 500MB para download + extração)
            const requiredSpace = 500 * 1024 * 1024; // 500MB em bytes
            await this.checkDiskSpace(requiredSpace, progressCallback);
            
            // Verificar se já existe e se está atualizado
            if (await this.checkBrowserExists()) {
                sendProgress(10, 'Verificando atualizações...');
                const updateInfo = await this.checkForUpdates();
                
                if (!updateInfo.needsUpdate) {
                    console.log('[ChromiumDownloader] Chromium já está instalado e atualizado');
                    sendProgress(100, 'Chrome já está atualizado!');
                    return this.chromeExePath;
                }
                
                console.log('[ChromiumDownloader] Nova versão disponível, atualizando...');
                console.log(`[ChromiumDownloader] Versão atual: ${updateInfo.installedVersion}`);
                console.log(`[ChromiumDownloader] Nova versão: ${updateInfo.latestVersion}`);
                
                sendProgress(20, 'Removendo versão antiga...', null, updateInfo.latestVersion);
                // Remover versão antiga
                await this.removeOldVersion();
            }
            
            console.log('[ChromiumDownloader] Iniciando processo de instalação do Chromium...');
            sendProgress(25, 'Preparando instalação...');
            
            // Criar pasta browser
            await this.createBrowserDirectory();
            sendProgress(30, 'Iniciando download...');
            
            // Fazer download com callback de progresso
            await this.downloadChromium(progressCallback);
            
            sendProgress(85, 'Extraindo arquivos...');
            // Extrair com callback de progresso
            await this.extractChromium(progressCallback);
            
            sendProgress(95, 'Finalizando instalação...');
            // Limpar arquivo temporário
            await this.cleanupTempFile();
            
            // Verificar se a extração foi bem-sucedida
            if (await this.checkBrowserExists()) {
                console.log('[ChromiumDownloader] Chromium instalado com sucesso!');
                sendProgress(100, 'Chrome instalado com sucesso!');
                return this.chromeExePath;
            } else {
                throw new Error('Falha na instalação do Chromium - executável não encontrado após extração');
            }
            
        } catch (error) {
            console.error('[ChromiumDownloader] Erro no processo de instalação:', error);
            
            // Tentar limpeza em caso de erro
            try {
                await this.cleanupTempFile();
            } catch (cleanupError) {
                console.warn('[ChromiumDownloader] Erro na limpeza:', cleanupError.message);
            }
            
            // Categorizar tipos de erro para melhor feedback
            let errorMessage = 'Erro desconhecido';
            if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
                errorMessage = 'Erro de conexão - Verifique sua internet';
            } else if (error.message.includes('ENOSPC')) {
                errorMessage = 'Espaço insuficiente em disco';
            } else if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
                errorMessage = 'Erro de permissão - Execute como administrador';
            } else if (error.message.includes('7-Zip') || error.message.includes('tar')) {
                errorMessage = 'Erro na extração - Arquivo pode estar corrompido';
            } else {
                errorMessage = error.message;
            }
            
            if (progressCallback) {
                progressCallback({ 
                    percent: 0, 
                    message: `Erro: ${errorMessage}`,
                    speed: null,
                    version: null
                });
            }
            
            throw new Error(errorMessage);
        }
    }

    /**
     * Verifica se há atualizações e retorna informações sobre o status
     * @returns {Promise<{hasChrome: boolean, needsUpdate: boolean, installedVersion: string|null, latestVersion: string}>}
     */
    async getUpdateStatus() {
        try {
            const hasChrome = await this.checkBrowserExists();
            
            if (!hasChrome) {
                const latestReleaseInfo = await this.getLatestReleaseInfo();
                return {
                    hasChrome: false,
                    needsUpdate: true,
                    installedVersion: null,
                    latestVersion: latestReleaseInfo.version
                };
            }
            
            const updateInfo = await this.checkForUpdates();
            return {
                hasChrome: true,
                needsUpdate: updateInfo.needsUpdate,
                installedVersion: updateInfo.installedVersion,
                latestVersion: updateInfo.latestVersion
            };
            
        } catch (error) {
            console.error('[ChromiumDownloader] Erro ao verificar status de atualização:', error);
            throw error;
        }
    }

    /**
     * Retorna o caminho do executável do Chrome
     * @returns {string}
     */
    getChromePath() {
        return this.chromeExePath;
    }
}

module.exports = ChromiumDownloader;