const API_BASE_URL = '/api';

const elements = {
    idInstance: null,
    apiTokenInstance: null,

    btnGetSettings: null,
    btnGetStateInstance: null,
    btnSendMessage: null,
    btnSendFile: null,
    btnClearResponse: null,

    messageChatId: null,
    messageText: null,
    fileChatId: null,
    fileUrl: null,
    fileName: null,
    fileCaption: null,

    apiUrl: null,

    responseOutput: null,

    connectionStatus: null,
    statusText: null
};

let connectionState = 'disconnected';

document.addEventListener('DOMContentLoaded', () => {
    console.log('[GreenAPI] Инициализация приложения...');

    cacheElements();

    loadCredentials();

    updateConnectionStatus('connected');

    console.log('[GreenAPI] Приложение инициализировано');
});

function cacheElements() {
    elements.idInstance = document.getElementById('idInstance');
    elements.apiTokenInstance = document.getElementById('apiTokenInstance');

    elements.btnGetSettings = document.getElementById('btnGetSettings');
    elements.btnGetStateInstance = document.getElementById('btnGetStateInstance');
    elements.btnSendMessage = document.getElementById('btnSendMessage');
    elements.btnSendFile = document.getElementById('btnSendFile');
    elements.btnClearResponse = document.getElementById('btnClearResponse');

    elements.messageChatId = document.getElementById('messageChatId');
    elements.messageText = document.getElementById('messageText');
    elements.fileChatId = document.getElementById('fileChatId');
    elements.fileUrl = document.getElementById('fileUrl');
    elements.fileName = document.getElementById('fileName');
    elements.fileCaption = document.getElementById('fileCaption');

    elements.apiUrl = document.getElementById('apiUrl');

    elements.responseOutput = document.getElementById('responseOutput');

    elements.connectionStatus = document.getElementById('connectionStatus');
    elements.statusText = document.getElementById('statusText');

    if (elements.fileUrl) {
        elements.fileUrl.addEventListener('blur', extractFileNameFromUrl);
    }
}

function extractFileNameFromUrl() {
    const url = elements.fileUrl.value.trim();

    if (!url || !elements.fileName) return;

    if (elements.fileName.value.trim() !== '') return;

    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;

        const fileName = pathname.substring(pathname.lastIndexOf('/') + 1);

        if (fileName && fileName.includes('.')) {
            elements.fileName.value = decodeURIComponent(fileName);
            console.log('[GreenAPI] Имя файла извлечено из URL:', fileName);
        }
    } catch (e) {
        const fileName = url.substring(url.lastIndexOf('/') + 1);
        if (fileName && fileName.includes('.') && !fileName.includes('?')) {
            elements.fileName.value = decodeURIComponent(fileName);
        }
    }
}

async function loadCredentials() {
    try {
        const response = await fetch(`${API_BASE_URL}/credentials`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success) {
            elements.idInstance.value = data.data.idInstance;
            elements.apiTokenInstance.value = data.data.apiTokenInstance;
            if (data.data.apiUrl && elements.apiUrl) {
                elements.apiUrl.value = data.data.apiUrl;
            }
            console.log('[GreenAPI] Учетные данные загружены');
        } else {
            throw new Error(data.error || 'Ошибка загрузки данных');
        }
    } catch (error) {
        console.error('[GreenAPI] Ошибка загрузки учетных данных:', error);
        elements.idInstance.value = 'Ошибка загрузки';
        elements.apiTokenInstance.value = 'Ошибка загрузки';
        showToast('Ошибка загрузки учетных данных', 'error');
        updateConnectionStatus('disconnected');
    }
}

async function saveCredentials() {
    const idInstance = elements.idInstance.value.trim();
    const apiTokenInstance = elements.apiTokenInstance.value.trim();
    const apiUrl = elements.apiUrl ? elements.apiUrl.value.trim() : 'https://1105.api.green-api.com';

    if (!idInstance) {
        showToast('Введите ID инстанса', 'error');
        elements.idInstance.focus();
        return;
    }

    if (!apiTokenInstance) {
        showToast('Введите API токен', 'error');
        elements.apiTokenInstance.focus();
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/credentials`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                idInstance: idInstance,
                apiTokenInstance: apiTokenInstance,
                apiUrl: apiUrl
            })
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error || `HTTP ${response.status}`);
        }

        displayResponse(responseData, 'Учетные данные сохранены');
        showToast('Учетные данные сохранены', 'success');
        updateConnectionStatus('connected');
    } catch (error) {
        displayError(error, 'Ошибка сохранения');
        showToast('Ошибка: ' + error.message, 'error');
    }
}

async function apiRequest(endpoint, data = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    console.log(`[GreenAPI] Запрос к ${endpoint}:`, data);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const responseData = await response.json();

        console.log(`[GreenAPI] Ответ от ${endpoint}:`, responseData);

        if (!response.ok) {
            throw new Error(responseData.error || `HTTP ${response.status}`);
        }

        return responseData;
    } catch (error) {
        console.error(`[GreenAPI] Ошибка запроса к ${endpoint}:`, error);
        throw error;
    }
}

async function getSettings() {
    const button = elements.btnGetSettings;
    setButtonLoading(button, true);

    try {
        const response = await apiRequest('/getSettings');
        displayResponse(response, 'Настройки аккаунта');
        showToast('Настройки получены успешно', 'success');
    } catch (error) {
        displayError(error, 'Ошибка получения настроек');
        showToast('Ошибка: ' + error.message, 'error');
    } finally {
        setButtonLoading(button, false);
    }
}

async function getStateInstance() {
    const button = elements.btnGetStateInstance;
    setButtonLoading(button, true);

    try {
        const response = await apiRequest('/getStateInstance');
        displayResponse(response, 'Состояние экземпляра');
        showToast('Состояние получено успешно', 'success');
    } catch (error) {
        displayError(error, 'Ошибка получения состояния');
        showToast('Ошибка: ' + error.message, 'error');
    } finally {
        setButtonLoading(button, false);
    }
}

async function sendMessage() {
    const button = elements.btnSendMessage;
    const chatId = elements.messageChatId.value.trim();
    const message = elements.messageText.value.trim();

    if (!chatId) {
        showToast('Введите Chat ID', 'error');
        elements.messageChatId.focus();
        return;
    }

    if (!message) {
        showToast('Введите текст сообщения', 'error');
        elements.messageText.focus();
        return;
    }

    setButtonLoading(button, true);

    try {
        const response = await apiRequest('/sendMessage', {
            chatId: chatId,
            message: message
        });

        displayResponse(response, 'Результат отправки сообщения');
        showToast('Сообщение отправлено', 'success');

        elements.messageText.value = '';
    } catch (error) {
        displayError(error, 'Ошибка отправки сообщения');
        showToast('Ошибка: ' + error.message, 'error');
    } finally {
        setButtonLoading(button, false);
    }
}

async function sendFileByUrl() {
    const button = elements.btnSendFile;
    const chatId = elements.fileChatId.value.trim();
    const urlFile = elements.fileUrl.value.trim();
    const fileName = elements.fileName.value.trim();
    const caption = elements.fileCaption.value.trim();

    if (!chatId) {
        showToast('Введите Chat ID', 'error');
        elements.fileChatId.focus();
        return;
    }

    if (!urlFile) {
        showToast('Введите URL файла', 'error');
        elements.fileUrl.focus();
        return;
    }

    if (!fileName) {
        showToast('Введите название файла (обязательно)', 'error');
        elements.fileName.focus();
        return;
    }

    try {
        new URL(urlFile);
    } catch (e) {
        showToast('Некорректный URL', 'error');
        elements.fileUrl.focus();
        return;
    }

    setButtonLoading(button, true);

    try {
        const requestData = {
            chatId: chatId,
            urlFile: urlFile,
            fileName: fileName
        };

        if (caption) {
            requestData.caption = caption;
        }

        const response = await apiRequest('/sendFileByUrl', requestData);

        displayResponse(response, 'Результат отправки файла');
        showToast('Файл отправлен', 'success');

        elements.fileUrl.value = '';
    } catch (error) {
        displayError(error, 'Ошибка отправки файла');
        showToast('Ошибка: ' + error.message, 'error');
    } finally {
        setButtonLoading(button, false);
    }
}

function clearResponse() {
    elements.responseOutput.innerHTML = `
        <div class="placeholder-text">
            <p>👈 Результаты запросов будут отображаться здесь</p>
            <p class="small">Нажмите любую кнопку слева для выполнения запроса</p>
        </div>
    `;
    console.log('[GreenAPI] Окно ответов очищено');
}

function displayResponse(response, title = '') {
    const header = title ? `<div class="response-title">📋 ${escapeHtml(title)}</div>` : '';
    const jsonHtml = syntaxHighlight(response);

    elements.responseOutput.innerHTML = `
        ${header}
        <pre>${jsonHtml}</pre>
    `;

    elements.responseOutput.scrollTop = 0;
}

function displayError(error, title = 'Ошибка') {
    const errorResponse = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
    };

    const header = `<div class="response-title error">❌ ${escapeHtml(title)}</div>`;
    const jsonHtml = syntaxHighlight(errorResponse);

    elements.responseOutput.innerHTML = `
        ${header}
        <pre>${jsonHtml}</pre>
    `;
}

function syntaxHighlight(json) {
    if (typeof json !== 'string') {
        json = JSON.stringify(json, null, 2);
    }

    json = escapeHtml(json);

    return json.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
            let cls = 'json-number';

            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'json-key';
                } else {
                    cls = 'json-string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'json-boolean';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }

            return `<span class="${cls}">${match}</span>`;
        }
    );
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setButtonLoading(button, loading) {
    if (!button) return;

    if (loading) {
        button.disabled = true;
        button.classList.add('loading');
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = '<span class="loading-spinner"></span>';
    } else {
        button.disabled = false;
        button.classList.remove('loading');
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
            delete button.dataset.originalText;
        }
    }
}

function updateConnectionStatus(state) {
    connectionState = state;

    if (elements.connectionStatus) {
        elements.connectionStatus.className = 'status-indicator ' + state;
    }

    if (elements.statusText) {
        const statusTexts = {
            'connected': 'Подключено',
            'disconnected': 'Отключено',
            'loading': 'Подключение...'
        };
        elements.statusText.textContent = statusTexts[state] || state;
    }
}

function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        if (e.target === elements.messageText) {
            e.preventDefault();
            sendMessage();
        }
        if (e.target === elements.fileUrl) {
            e.preventDefault();
            sendFileByUrl();
        }
    }
});

window.addEventListener('error', (e) => {
    console.error('[GreenAPI] Глобальная ошибка:', e.error);
    showToast('Произошла ошибка приложения', 'error');
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('[GreenAPI] Необработанное Promise отклонение:', e.reason);
});

window.getSettings = getSettings;
window.getStateInstance = getStateInstance;
window.sendMessage = sendMessage;
window.sendFileByUrl = sendFileByUrl;
window.saveCredentials = saveCredentials;
window.clearResponse = clearResponse;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        apiRequest,
        displayResponse,
        displayError,
        syntaxHighlight,
        escapeHtml,
        setButtonLoading,
        updateConnectionStatus,
        showToast
    };
}
