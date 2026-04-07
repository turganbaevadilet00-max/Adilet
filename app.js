/**
 * Финансовый ИИ-чатбот для молодёжи Кыргызстана
 * Использует Groq API с моделью meta-llama/llama-4-scout-17b-16e-instruct
 * Сохраняет историю чатов в localStorage
 */

// === КОНФИГУРАЦИЯ ===
const GROQ_API_KEY = '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';
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

// Системный промпт: финансовый ассистент для молодёжи Кыргызстана
const SYSTEM_PROMPT = `Ты — ADI GPT, дружелюбный личный умный ассистент для молодёжи мира. 
Твоя задача: помогать молодым людям (16-30 лет) разбираться в личных финансах, бюджетировании, сбережениях, инвестициях, кредитах, налогах в контексте Кыргызстана. 
Отвечай на русском на кыргыском на англиском языке приводи примеры из жизни из мира логические вопросы 
Будь позитивным, мотивирующим и практичным. Не давай юридических консультаций, но объясняй базовые принципы. 
Учитывай местные реалии: волюты, карты мобильные операторы, переводы, копилки, стартапы.`;

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let chats = [];          // Массив всех чатов: { id, title, createdAt, messages }
let currentChatId = null;  // ID текущего активного чата
let isLoading = false;      // Флаг загрузки (чтобы не отправлять несколько запросов)

// === DOM ЭЛЕМЕНТЫ ===
const messagesArea = document.getElementById('messagesArea');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatsList = document.getElementById('chatsList');
const newChatBtn = document.getElementById('newChatBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const typingIndicator = document.getElementById('typingIndicator');
const apiStatus = document.getElementById('apiStatus');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebar = document.getElementById('sidebar');

// === ИНИЦИАЛИЗАЦИЯ ===
function init() {
    loadChatsFromStorage();
    if (chats.length === 0) {
        createNewChat();
    } else {
        // Открываем последний активный чат или первый
        const lastChat = chats[chats.length - 1];
        currentChatId = lastChat.id;
        renderChatsList();
        renderMessages(currentChatId);
    }
    setupEventListeners();
    updateApiStatus(true);
}

// === РАБОТА С LOCALSTORAGE ===
function saveChatsToStorage() {
    try {
        localStorage.setItem('ADI GPT', JSON.stringify(chats));
    } catch (error) {
        console.error('Ошибка сохранения в localStorage:', error);
        showError('Не удалось сохранить историю чатов');
    }
}

function loadChatsFromStorage() {
    const stored = localStorage.getItem('ADI GPT');
    if (stored) {
        try {
            chats = JSON.parse(stored);
            // Валидация структуры
            if (!Array.isArray(chats)) chats = [];
        } catch (error) {
            console.error('Ошибка загрузки из localStorage:', error);
            chats = [];
        }
    } else {
        chats = [];
    }
}

// === СОЗДАНИЕ НОВОГО ЧАТА ===
function createNewChat() {
    const newChat = {
        id: Date.now().toString(),
        title: `Чат ${chats.length + 1}`,
        createdAt: new Date().toISOString(),
        messages: [
            {
                role: 'assistant',
                content: '👋 Привет! Я ADI GPT— твой финансовый помощник. Задавай любые вопросы о деньгах, бюджете, сбережениях и инвестициях в мира . Чем могу помочь? 💰'
            }
        ]
    };
    chats.push(newChat);
    currentChatId = newChat.id;
    saveChatsToStorage();
    renderChatsList();
    renderMessages(currentChatId);
    // Прокрутка вниз
    scrollToBottom();
}

// === ОТРИСОВКА СПИСКА ЧАТОВ ===
function renderChatsList() {
    if (!chatsList) return;
    chatsList.innerHTML = '';
    chats.forEach(chat => {
        const li = document.createElement('li');
        li.className = 'chat-item';
        if (chat.id === currentChatId) li.classList.add('active');
        
        // Берём первое сообщение пользователя как заголовок, если есть
        const userMessage = chat.messages.find(m => m.role === 'user');
        const title = userMessage 
            ? (userMessage.content.substring(0, 30) + (userMessage.content.length > 30 ? '...' : ''))
            : chat.title;
        
        const date = new Date(chat.createdAt).toLocaleDateString('ru-RU', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });
        
        li.innerHTML = `
            <div class="chat-title">${escapeHtml(title)}</div>
            <div class="chat-date">${date}</div>
        `;
        li.addEventListener('click', (e) => {
            e.stopPropagation();
            switchChat(chat.id);
            // === СОЗДАНИЕ DOM ЭЛЕМЕНТА СООБЩЕНИЯ ===
function createMessageElement(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role === 'user' ? 'user' : 'bot'}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    // Поддержка переносов строк
    contentDiv.innerHTML = escapeHtml(content).replace(/\n/g, '<br>');
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    
    // === КОЧУРУУ КНОПКАСЫН КОШУУ (бот үчүн) ===
    if (role === 'assistant') {
        const copyBtn = addCopyButtonToBotMessage(content);
        messageDiv.appendChild(copyBtn);
    }
    
    return messageDiv;
}
        });
        chatsList.appendChild(li);
    });
}

// === ПЕРЕКЛЮЧЕНИЕ МЕЖДУ ЧАТАМИ ===
function switchChat(chatId) {
    if (isLoading) {
        showError('Подождите, идёт ответ от ассистента...');
        return;
        // === КОЧУРУУ КНОПКАСЫН КОШУУ ФУНКЦИЯСЫ ===
function addCopyButtonToBotMessage(content) {
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.innerHTML = '📋 Копировать';
    
    copyBtn.onclick = async function() {
        try {
            await navigator.clipboard.writeText(content);
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = '✅ Скопировано!';
            copyBtn.classList.add('copied');
            
            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
                copyBtn.classList.remove('copied');
            }, 2000);
        } catch (err) {
            console.error('Көчүрүү катасы:', err);
            copyBtn.innerHTML = '❌ Ката';
            setTimeout(() => {
                copyBtn.innerHTML = '📋 Копировать';
            }, 2000);
        }
    };
    
    return copyBtn;
}
    }
    currentChatId = chatId;
    renderChatsList();
    renderMessages(currentChatId);
    // Закрыть мобильное меню при переключении
    if (sidebar.classList.contains('mobile-open')) {
        sidebar.classList.remove('mobile-open');
    }
}

// === ОТРИСОВКА СООБЩЕНИЙ В ТЕКУЩЕМ ЧАТЕ ===
function renderMessages(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    messagesArea.innerHTML = '';
    chat.messages.forEach(msg => {
        const messageDiv = createMessageElement(msg.role, msg.content);
        messagesArea.appendChild(messageDiv);
    });
    scrollToBottom();
}

// === СОЗДАНИЕ DOM ЭЛЕМЕНТА СООБЩЕНИЯ ===
function createMessageElement(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role === 'user' ? 'user' : 'bot'}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    // Поддержка переносов строк
    contentDiv.innerHTML = escapeHtml(content).replace(/\n/g, '<br>');
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    return messageDiv;
}

// === ОТПРАВКА СООБЩЕНИЯ ===
async function sendMessage() {
    if (isLoading) {
        showError('иди гуляй, дождитесь ответа бота');
        return;
    }
    
    const userText = messageInput.value.trim();
    if (!userText) return;
    
    // Найти текущий чат
    const currentChat = chats.find(c => c.id === currentChatId);
    if (!currentChat) return;
    
    // Добавить сообщение пользователя
    currentChat.messages.push({ role: 'user', content: userText });
    
    // Обновить заголовок чата (если это первое сообщение пользователя)
    if (currentChat.messages.filter(m => m.role === 'user').length === 1) {
        const shortTitle = userText.length > 30 ? userText.substring(0, 30) + '...' : userText;
        currentChat.title = shortTitle;
    }
    
    saveChatsToStorage();
    renderMessages(currentChatId);
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    // Показать индикатор печати
    typingIndicator.style.display = 'flex';
    isLoading = true;
    updateApiStatus(false);
    
    try {
        // Подготовка истории сообщений для API
        const messagesForAPI = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...currentChat.messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }))
        ];
        
        // Вызов Groq API
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: messagesForAPI,
                temperature: 0.7,
                max_tokens: 1024,
                top_p: 0.9
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Ошибка API: ${response.status} - ${errorData.error?.message || 'Неизвестная ошибка'}`);
        }
        
        const data = await response.json();
        const botReply = data.choices[0]?.message?.content || 'Извините, не удалось получить ответ. Попробуйте ещё раз.';
        
        // Добавить ответ бота в чат
        currentChat.messages.push({ role: 'assistant', content: botReply });
        saveChatsToStorage();
        renderMessages(currentChatId);
        
    } catch (error) {
        console.error('Ошибка при запросе к Groq:', error);
        showError(`Не удалось получить ответ: ${error.message}. Проверьте интернет и API ключ.`);
        
        // Добавить сообщение об ошибке от бота
        currentChat.messages.push({ 
            role: 'assistant', 
            content: `❌ Техническая ошибка: ${error.message}. Пожалуйста, проверьте подключение или попробуйте позже.` 
        });
        saveChatsToStorage();
        renderMessages(currentChatId);
    } finally {
        typingIndicator.style.display = 'none';
        isLoading = false;
        updateApiStatus(true);
        scrollToBottom();
    }
}

// === ОЧИСТКА ВСЕЙ ИСТОРИИ ===
function clearAllHistory() {
    if (confirm('Вы уверены, что хотите удалить ВСЮ историю чатов? Это действие нельзя отменить.')) {
        chats = [];
        saveChatsToStorage();
        createNewChat(); // Создаём новый чистый чат
        renderChatsList();
        showError('История очищена. Начат новый диалог.', false);
    }
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message, isError = true) {
    const statusDiv = apiStatus;
    statusDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
    statusDiv.style.color = '#ef4444';
    setTimeout(() => {
        if (isError) {
            statusDiv.innerHTML = '<i class="fas fa-circle" style="color: #2ecc71;"></i> Готов';
            statusDiv.style.color = '';
        } else {
            setTimeout(() => {
                statusDiv.innerHTML = '<i class="fas fa-circle" style="color: #2ecc71;"></i> Готов';
                statusDiv.style.color = '';
            }, 3000);
        }
    }, 4000);
}

function updateApiStatus(isReady) {
    if (isReady) {
        apiStatus.innerHTML = '<i class="fas fa-circle" style="color: #2ecc71;"></i> Готов';
    } else {
        apiStatus.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Отправка запроса...';
    }
}

function scrollToBottom() {
    const container = document.querySelector('.messages-container');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

// === АДАПТИВНЫЙ МОБИЛЬНЫЙ МЕНЮ ===
function setupEventListeners() {
    sendBtn.addEventListener('click', sendMessage);
    newChatBtn.addEventListener('click', () => {
        createNewChat();
        if (sidebar.classList.contains('mobile-open')) {
            sidebar.classList.remove('mobile-open');
        }
    });
    clearHistoryBtn.addEventListener('click', clearAllHistory);
    
    // Отправка по Enter (Shift+Enter для новой строки)
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Авто-расширение textarea
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
    
    // Мобильное меню
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });
    }
    
    // Закрыть меню при клике вне сайдбара на мобильных
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target) && sidebar.classList.contains('mobile-open')) {
                sidebar.classList.remove('mobile-open');
            }
        }
    });
}

// === ЗАПУСК ПРИЛОЖЕНИЯ ===
init();// ===== КОЧУРУУ КНОПКАСЫ (ТЕСТТИК ВЕРСИЯ) =====
console.log('Кочүрүү кнопкасынын скрипты жүктөлдү!');

// createMessageElement функциясын толугу менен алмаштырабыз
window.originalCreateMessage = window.createMessageElement;
window.createMessageElement = function(role, content) {
    console.log('Message түзүлүүдө:', role, content.substring(0, 50));
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role === 'user' ? 'user' : 'bot'}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = escapeHtml(content).replace(/\n/g, '<br>');
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    
    // Ботко көчүрүү кнопкасы
    if (role === 'assistant') {
        console.log('Ботко кнопка кошулууда...');
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.textContent = '📋 Копировать';
        copyBtn.style.cssText = `
            background-color: #e0e0e0;
            border: none;
            border-radius: 6px;
            padding: 4px 10px;
            margin-top: 8px;
            font-size: 12px;
            cursor: pointer;
            color: #333;
            width: fit-content;
        `;
        
        copyBtn.onclick = function() {
            console.log('Кнопка басылды! Текст:', content);
            navigator.clipboard.writeText(content).then(() => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '✅ Скопировано!';
                copyBtn.style.backgroundColor = '#4caf50';
                copyBtn.style.color = 'white';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.style.backgroundColor = '#e0e0e0';
                    copyBtn.style.color = '#333';
                }, 2000);
                console.log('Текст көчүрүлдү!');
            }).catch(err => {
                console.error('Көчүрүү катасы:', err);
                copyBtn.textContent = '❌ Ошибка';
                setTimeout(() => {
                    copyBtn.textContent = '📋 Копировать';
                }, 2000);
            });
        };
        
        messageDiv.appendChild(copyBtn);
        console.log('Кнопка кошулду!');
    }
    
    return messageDiv;
};

console.log('createMessageElement функциясы алмаштырылды!');