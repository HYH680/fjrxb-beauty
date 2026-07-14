// ===== 状态管理 =====
const state = {
    apiKey: '',
    apiBase: 'https://api.openai.com/v1',
    messages: [],
    isProcessing: false,
    model: 'gpt-4'
};

// ===== DOM 引用 =====
const dom = {
    navLinks: document.getElementById('navLinks'),
    navToggle: document.getElementById('navToggle'),
    navbar: document.querySelector('.navbar'),
    chatMessages: document.getElementById('chatMessages'),
    userInput: document.getElementById('userInput'),
    sendBtn: document.getElementById('sendBtn'),
    modelSelect: document.getElementById('modelSelect'),
    suggestionChips: document.querySelectorAll('.chip'),
    apiModal: document.getElementById('apiModal'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    apiBaseInput: document.getElementById('apiBaseInput'),
    modalClose: document.getElementById('modalClose'),
    modalCancel: document.getElementById('modalCancel'),
    modalSave: document.getElementById('modalSave'),
    toggleKey: document.getElementById('toggleKey'),
    typingTemplate: document.getElementById('typingTemplate')
};

// ===== 导航栏交互 =====
dom.navToggle.addEventListener('click', () => {
    dom.navLinks.classList.toggle('show');
});

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        dom.navLinks.classList.remove('show');
        document.querySelector('.nav-links a.active')?.classList.remove('active');
        link.classList.add('active');
    });
});

window.addEventListener('scroll', () => {
    dom.navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// ===== 统计数字动画 =====
function animateCounters() {
    document.querySelectorAll('.stat-number').forEach(counter => {
        const target = parseInt(counter.dataset.target);
        const duration = 2000;
        const step = Math.ceil(target / (duration / 16));
        let current = 0;

        const update = () => {
            current += step;
            if (current >= target) {
                counter.textContent = target.toLocaleString();
                return;
            }
            counter.textContent = current.toLocaleString();
            requestAnimationFrame(update);
        };
        update();
    });
}

const aboutSection = document.querySelector('.about');
let countersAnimated = false;

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !countersAnimated) {
            countersAnimated = true;
            animateCounters();
        }
    });
}, { threshold: 0.3 });

if (aboutSection) observer.observe(aboutSection);

// ===== 功能卡片渐入动画 =====
const featureCards = document.querySelectorAll('.feature-card');
const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const delay = parseInt(entry.target.dataset.delay) || 0;
            setTimeout(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }, delay);
            cardObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

featureCards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    cardObserver.observe(card);
});

// ===== 自动调整输入框高度 =====
dom.userInput.addEventListener('input', () => {
    dom.userInput.style.height = 'auto';
    dom.userInput.style.height = Math.min(dom.userInput.scrollHeight, 150) + 'px';
});

dom.userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// ===== 发送消息 =====
async function sendMessage() {
    const text = dom.userInput.value.trim();
    if (!text || state.isProcessing) return;

    dom.userInput.value = '';
    dom.userInput.style.height = 'auto';

    // 添加用户消息
    addMessage(text, 'user');
    state.messages.push({ role: 'user', content: text });

    // 如果没有 API Key，弹出配置
    if (!state.apiKey) {
        dom.apiModal.classList.add('active');
        dom.apiKeyInput.focus();
        return;
    }

    // 显示打字指示
    const typingEl = showTypingIndicator();

    state.isProcessing = true;
    dom.sendBtn.disabled = true;

    try {
        await callAI(text);
    } catch (error) {
        removeTypingIndicator(typingEl);
        addMessage(`抱歉，请求出错了：${error.message}`, 'ai');
    } finally {
        state.isProcessing = false;
        dom.sendBtn.disabled = false;
    }
}

function addMessage(text, role) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = formatMessage(text);

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    dom.chatMessages.appendChild(messageDiv);
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;

    return messageDiv;
}

function formatMessage(text) {
    // 代码块
    text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
        return `<pre><code class="language-${lang || 'plaintext'}">${escapeHtml(code.trim())}</code></pre>`;
    });

    // 行内代码
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 换行
    text = text.replace(/\n/g, '<br>');

    return text;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showTypingIndicator() {
    const template = dom.typingTemplate.content.cloneNode(true);
    const el = template.firstElementChild;
    dom.chatMessages.appendChild(el);
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
    return el;
}

function removeTypingIndicator(el) {
    if (el && el.parentNode) {
        el.parentNode.removeChild(el);
    }
}

// ===== AI API 调用 =====
async function callAI(userText) {
    const response = await fetch(`${state.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.apiKey}`
        },
        body: JSON.stringify({
            model: state.model,
            messages: [
                { role: 'system', content: '你是一个智能、友好、全面的AI助手。请用中文回答用户的问题。' },
                ...state.messages.slice(-10)
            ],
            temperature: 0.7,
            max_tokens: 2000
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // 移除打字指示
    const typingEl = dom.chatMessages.querySelector('.typing-indicator');
    removeTypingIndicator(typingEl);

    addMessage(reply, 'ai');
    state.messages.push({ role: 'assistant', content: reply });

    return reply;
}

// ===== 快捷指令 (Suggestion Chips) =====
dom.suggestionChips.forEach(chip => {
    chip.addEventListener('click', () => {
        dom.userInput.value = chip.dataset.prompt;
        dom.userInput.style.height = 'auto';
        dom.userInput.style.height = Math.min(dom.userInput.scrollHeight, 150) + 'px';
        dom.userInput.focus();
    });
});

// ===== 发送按钮 =====
dom.sendBtn.addEventListener('click', sendMessage);

// ===== 模型切换 =====
dom.modelSelect.addEventListener('change', () => {
    state.model = dom.modelSelect.value;
});

// ===== API Key 弹窗 =====
dom.modalClose.addEventListener('click', () => dom.apiModal.classList.remove('active'));
dom.modalCancel.addEventListener('click', () => dom.apiModal.classList.remove('active'));

dom.apiModal.addEventListener('click', (e) => {
    if (e.target === dom.apiModal) dom.apiModal.classList.remove('active');
});

dom.toggleKey.addEventListener('click', () => {
    const input = dom.apiKeyInput;
    const icon = dom.toggleKey.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
});

dom.modalSave.addEventListener('click', () => {
    const key = dom.apiKeyInput.value.trim();
    const base = dom.apiBaseInput.value.trim();

    if (!key) {
        alert('请输入 API Key');
        return;
    }

    state.apiKey = key;
    if (base) state.apiBase = base;

    // 自动继续发送缓存的用户消息
    dom.apiModal.classList.remove('active');

    // 如果还有未处理的消息，继续发送
    if (state.messages.length > 0 && !state.isProcessing) {
        const lastMsg = state.messages[state.messages.length - 1];
        if (lastMsg.role === 'user') {
            const typingEl = showTypingIndicator();
            state.isProcessing = true;
            dom.sendBtn.disabled = true;
            callAI(lastMsg.content)
                .catch(err => {
                    removeTypingIndicator(typingEl);
                    addMessage(`抱歉，请求出错了：${err.message}`, 'ai');
                })
                .finally(() => {
                    state.isProcessing = false;
                    dom.sendBtn.disabled = false;
                });
        }
    }
});

// ===== 键盘快捷键：Ctrl+K 打开 API 设置 =====
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        dom.apiModal.classList.add('active');
        dom.apiKeyInput.focus();
    }
});

// ===== 从 localStorage 恢复 Key =====
(function init() {
    const savedKey = localStorage.getItem('ai_api_key');
    const savedBase = localStorage.getItem('ai_api_base');
    const savedModel = localStorage.getItem('ai_model');

    if (savedKey) {
        state.apiKey = savedKey;
        dom.apiKeyInput.value = savedKey;
    }
    if (savedBase) {
        state.apiBase = savedBase;
        dom.apiBaseInput.value = savedBase;
    }
    if (savedModel) {
        state.model = savedModel;
        dom.modelSelect.value = savedModel;
    }

    // 保存到 localStorage
    dom.modalSave.addEventListener('click', () => {
        localStorage.setItem('ai_api_key', state.apiKey);
        localStorage.setItem('ai_api_base', state.apiBase);
        localStorage.setItem('ai_model', state.model);
    });
})();

console.log('%c AI 智能助手 v1.0 ', 'background: linear-gradient(135deg, #6c5ce7, #00cec9); color: white; font-size: 16px; padding: 10px 20px; border-radius: 8px; font-weight: bold;');
console.log('按 Ctrl+K 打开 API 设置');