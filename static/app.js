// KINI AI 3.5 - Gemini Luxury Architecture Controller (Real-time Grounding & Legal Precision)
let currentConvId = "default";
let selectedFile = null;
let currentAudioPlayer = null;
let speechRecognizer = null;
let isRecording = false;

document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp() {
    initNavigationAndModals();
    initChatCore();
    initSpeechToText();
    initMemories();
    initSettings();
    initGallery();
    loadConversations();
    checkInitialHero();
}

// ============================================================
// 1. ĐIỀU HƯỚNG, SIDEBAR & MODALS
// ============================================================
function initNavigationAndModals() {
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebar-overlay");
    const toggleBtn = document.getElementById("btn-toggle-sidebar");
    const closeBtn = document.getElementById("btn-close-sidebar");

    function openSidebar() {
        sidebar.classList.add("open");
        sidebarOverlay.classList.add("open");
    }
    function closeSidebar() {
        sidebar.classList.remove("open");
        sidebarOverlay.classList.remove("open");
    }

    if (toggleBtn) toggleBtn.addEventListener("click", openSidebar);
    if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebar);

    // Modal Triggers
    document.getElementById("btn-open-memory-modal")?.addEventListener("click", () => {
        closeSidebar();
        openModal("modal-memory");
        loadMemories();
    });

    document.getElementById("btn-open-gallery-modal")?.addEventListener("click", () => {
        closeSidebar();
        openModal("modal-gallery");
        loadGallery();
    });

    document.getElementById("btn-open-settings-modal")?.addEventListener("click", () => {
        closeSidebar();
        openModal("modal-settings");
        loadSettings();
    });

    // Close Modal buttons
    document.querySelectorAll("[data-close]").forEach(btn => {
        btn.addEventListener("click", () => {
            const modalId = btn.dataset.close;
            closeModal(modalId);
        });
    });

    window.addEventListener("click", (e) => {
        if (e.target.classList.contains("modal")) {
            e.target.style.display = "none";
        }
    });

    // Quick Action Suggestion Pills
    document.querySelectorAll(".quick-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            const action = pill.dataset.action;
            const input = document.getElementById("main-user-input");
            if (action === "draw") {
                input.value = "Vẽ cho tôi logo KINI AI 3D phát sáng neon công nghệ tương lai, 8k";
                input.focus();
            } else if (action === "document") {
                document.getElementById("menu-attach-file")?.click();
            } else if (action === "memory") {
                openModal("modal-memory");
                loadMemories();
            } else {
                input.focus();
            }
        });
    });

    // Model Selector Dropdown
    const modelBadge = document.getElementById("btn-model-badge");
    const modelDropdown = document.getElementById("model-dropdown-menu");
    const modelLabel = document.getElementById("model-label");

    if (modelBadge && modelDropdown) {
        modelBadge.addEventListener("click", (e) => {
            e.stopPropagation();
            modelDropdown.classList.toggle("show");
        });

        document.querySelectorAll(".model-option").forEach(opt => {
            opt.addEventListener("click", () => {
                document.querySelectorAll(".model-option").forEach(o => o.classList.remove("active"));
                opt.classList.add("active");
                const m = opt.dataset.model;
                modelLabel.textContent = m === "flash" ? "Flash Siêu Tốc" : "Gemini Pro Deep";
                modelDropdown.classList.remove("show");
            });
        });

        document.addEventListener("click", () => {
            modelDropdown.classList.remove("show");
        });
    }

    // Attach File Popup Menu
    const attachBtn = document.getElementById("btn-open-attach-menu");
    const attachMenu = document.getElementById("attach-popup-menu");
    const fileInput = document.getElementById("global-file-input");

    if (attachBtn && attachMenu && fileInput) {
        attachBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            attachMenu.classList.toggle("show");
        });

        document.getElementById("menu-attach-file")?.addEventListener("click", () => {
            fileInput.accept = ".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.py,.js,.html,.css,.json";
            fileInput.click();
            attachMenu.classList.remove("show");
        });

        document.getElementById("menu-attach-image")?.addEventListener("click", () => {
            fileInput.accept = ".jpg,.jpeg,.png,.webp,.gif";
            fileInput.click();
            attachMenu.classList.remove("show");
        });

        fileInput.addEventListener("change", (e) => {
            if (e.target.files && e.target.files[0]) {
                handleFileSelected(e.target.files[0]);
            }
        });

        document.addEventListener("click", () => {
            attachMenu.classList.remove("show");
        });
    }

    // Gỡ tệp đính kèm
    document.getElementById("btn-remove-attach")?.addEventListener("click", () => {
        selectedFile = null;
        fileInput.value = "";
        document.getElementById("attachment-preview-bar").style.display = "none";
    });

    // Đoạn chat mới
    document.getElementById("btn-top-new-chat")?.addEventListener("click", startNewChat);
    document.getElementById("btn-sidebar-new-chat")?.addEventListener("click", () => {
        closeSidebar();
        startNewChat();
    });
}

function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = "flex";
}

function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = "none";
}

function handleFileSelected(file) {
    selectedFile = file;
    const bar = document.getElementById("attachment-preview-bar");
    const nameSpan = document.getElementById("attach-name");
    const iconSpan = document.getElementById("attach-icon");

    const ext = file.name.split('.').pop().toLowerCase();
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
        iconSpan.textContent = "🖼️";
    } else if (["pdf"].includes(ext)) {
        iconSpan.textContent = "📕";
    } else if (["docx", "doc"].includes(ext)) {
        iconSpan.textContent = "📘";
    } else if (["xlsx", "xls", "csv"].includes(ext)) {
        iconSpan.textContent = "📊";
    } else {
        iconSpan.textContent = "📄";
    }

    nameSpan.textContent = file.name;
    bar.style.display = "flex";
}

// ============================================================
// 2. CHAT CORE LOGIC (CHUẨN GEMINI)
// ============================================================
function initChatCore() {
    const userInput = document.getElementById("main-user-input");
    const sendBtn = document.getElementById("btn-send-message");

    // Tự động tăng chiều cao cho textarea khi gõ nhiều dòng
    userInput.addEventListener("input", () => {
        userInput.style.height = "auto";
        userInput.style.height = Math.min(userInput.scrollHeight, 150) + "px";
    });

    // Nhấn Enter để gửi (Shift + Enter để xuống dòng)
    userInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendBtn.addEventListener("click", sendMessage);
}

function checkInitialHero() {
    const messages = document.getElementById("chat-messages");
    const hero = document.getElementById("hero-section");
    const viewport = document.getElementById("chat-viewport");

    if (!messages || messages.children.length === 0) {
        if (hero) hero.style.display = "flex";
        if (viewport) viewport.style.display = "none";
    } else {
        if (hero) hero.style.display = "none";
        if (viewport) viewport.style.display = "block";
    }
}

async function sendMessage() {
    const userInput = document.getElementById("main-user-input");
    const message = userInput.value.trim();

    if (!message && !selectedFile) return;

    // Chuyển từ giao diện Hero sang giao diện Chat
    document.getElementById("hero-section").style.display = "none";
    const viewport = document.getElementById("chat-viewport");
    viewport.style.display = "block";

    // 1. Hiển thị tin nhắn người dùng ngay lập tức
    appendUserMessage(message, selectedFile);

    // Reset input
    userInput.value = "";
    userInput.style.height = "auto";

    const fileToSend = selectedFile;
    selectedFile = null;
    document.getElementById("attachment-preview-bar").style.display = "none";
    document.getElementById("global-file-input").value = "";

    // 2. Hiển thị loading indicator cho KINI
    const loadingId = appendLoadingMessage();

    try {
        const formData = new FormData();
        formData.append("conv_id", currentConvId);
        formData.append("message", message);
        formData.append("model_mode", document.querySelector(".model-option.active")?.dataset.model || "flash");
        
        if (fileToSend) {
            formData.append("file", fileToSend);
        }

        const res = await fetch("/api/chat", {
            method: "POST",
            body: formData
        });

        const data = await res.json();
        removeLoadingMessage(loadingId);

        if (data.reply) {
            appendAssistantMessage(data.reply, data.image_url, data.is_image_generated);
            // Cập nhật số lượng ký ức
            updateMemoryCountBadge();
        } else {
            appendAssistantMessage("⚠️ Không nhận được phản hồi từ KINI AI. Vui lòng thử lại.");
        }

    } catch (err) {
        removeLoadingMessage(loadingId);
        appendAssistantMessage("❌ Lỗi kết nối tới máy chủ KINI AI: " + err.message);
    }
}

function appendUserMessage(text, file) {
    const container = document.getElementById("chat-messages");
    const row = document.createElement("div");
    row.className = "message-row user";

    let fileHtml = "";
    if (file) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
            const previewUrl = URL.createObjectURL(file);
            fileHtml = `<img src="${previewUrl}" class="msg-inline-image" style="max-height:220px;" alt="upload">`;
        } else {
            fileHtml = `<div style="font-size:0.82rem; opacity:0.85; margin-bottom:4px;">📎 Đính kèm tệp: <b>${file.name}</b></div>`;
        }
    }

    row.innerHTML = `
        <div class="message-body">
            <div class="message-bubble">
                ${fileHtml}
                <div>${escapeHtml(text)}</div>
            </div>
        </div>
    `;

    container.appendChild(row);
    scrollToBottom();
}

function appendLoadingMessage() {
    const container = document.getElementById("chat-messages");
    const row = document.createElement("div");
    const id = "loading-" + Date.now();
    row.id = id;
    row.className = "message-row assistant";
    row.innerHTML = `
        <div class="message-avatar">K</div>
        <div class="message-body">
            <div class="message-bubble" style="display:flex; align-items:center; gap:8px; color:var(--text-secondary);">
                <span>KINI đang suy nghĩ & phân tích...</span>
            </div>
        </div>
    `;
    container.appendChild(row);
    scrollToBottom();
    return id;
}

function removeLoadingMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function appendAssistantMessage(content, imageUrl = "", isImageGen = false) {
    const container = document.getElementById("chat-messages");
    const row = document.createElement("div");
    row.className = "message-row assistant";

    let imgBlock = "";
    if (imageUrl) {
        imgBlock = `
            <div>
                <img src="${imageUrl}" class="msg-inline-image" alt="Artwork" onclick="openLightbox('${imageUrl}', '${escapeAttr(content)}')">
            </div>
        `;
    }

    const renderedHtml = formatMarkdown(content);

    row.innerHTML = `
        <div class="message-avatar">K</div>
        <div class="message-body">
            <div class="message-bubble">
                ${renderedHtml}
                ${imgBlock}
            </div>
            <div class="msg-actions">
                <button class="btn-msg-action btn-speak" title="Đọc bằng giọng nói tiếng Việt">
                    <span class="action-icon">🔊</span> Nghe đọc
                </button>
                <button class="btn-msg-action btn-copy-text" title="Sao chép nội dung">
                    <span class="action-icon">📋</span> Sao chép
                </button>
                <button class="btn-msg-action btn-export-word" title="Tải văn bản Word .docx">
                    <span class="action-icon">📄</span> Xuất Word
                </button>
                <button class="btn-msg-action btn-export-excel" title="Tải bảng tính Excel .xlsx">
                    <span class="action-icon">📊</span> Xuất Excel
                </button>
            </div>
        </div>
    `;

    // Gắn sự kiện các nút hành động
    const speakBtn = row.querySelector(".btn-speak");
    speakBtn.addEventListener("click", () => handleSpeakText(content, speakBtn));

    const copyBtn = row.querySelector(".btn-copy-text");
    copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(content);
        copyBtn.innerHTML = `<span>✓</span> Đã chép!`;
        setTimeout(() => copyBtn.innerHTML = `<span class="action-icon">📋</span> Sao chép`, 2000);
    });

    const wordBtn = row.querySelector(".btn-export-word");
    wordBtn.addEventListener("click", () => exportWordDocument(content));

    const excelBtn = row.querySelector(".btn-export-excel");
    excelBtn.addEventListener("click", () => exportExcelSheet(content));

    container.appendChild(row);
    scrollToBottom();
}

function scrollToBottom() {
    const viewport = document.getElementById("chat-viewport");
    if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
    }
}

// ============================================================
// 3. GIỌNG ĐỌC AI & THU ÂM TIẾNG VIỆT
// ============================================================
async function handleSpeakText(text, btnElement) {
    if (currentAudioPlayer) {
        currentAudioPlayer.pause();
        currentAudioPlayer = null;
        document.querySelectorAll(".btn-speak").forEach(b => b.classList.remove("speaking"));
    }

    btnElement.classList.add("speaking");
    btnElement.innerHTML = `<span>⏳</span> Đang tạo giọng...`;

    try {
        const voiceType = document.getElementById("setting-tts-voice")?.value || "female";
        const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text, voice: voiceType })
        });
        const data = await res.json();

        if (data.audio_url) {
            btnElement.innerHTML = `<span>🔊</span> Đang phát...`;
            const audio = new Audio(data.audio_url);
            currentAudioPlayer = audio;

            audio.onended = () => {
                btnElement.classList.remove("speaking");
                btnElement.innerHTML = `<span class="action-icon">🔊</span> Nghe đọc`;
                currentAudioPlayer = null;
            };
            audio.onerror = () => {
                btnElement.classList.remove("speaking");
                btnElement.innerHTML = `<span class="action-icon">🔊</span> Nghe đọc`;
            };
            audio.play();
        } else {
            alert("Không thể tạo giọng đọc: " + (data.error || "Lỗi không xác định"));
            btnElement.classList.remove("speaking");
            btnElement.innerHTML = `<span class="action-icon">🔊</span> Nghe đọc`;
        }
    } catch (e) {
        alert("Lỗi phát âm thanh: " + e.message);
        btnElement.classList.remove("speaking");
        btnElement.innerHTML = `<span class="action-icon">🔊</span> Nghe đọc`;
    }
}

// Thu âm giọng nói (Speech-to-Text)
function initSpeechToText() {
    const micBtn = document.getElementById("btn-voice-input");
    const input = document.getElementById("main-user-input");

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        if (micBtn) micBtn.title = "Trình duyệt không hỗ trợ nhận diện giọng nói Web Speech.";
        return;
    }

    speechRecognizer = new SpeechRecognition();
    speechRecognizer.lang = "vi-VN";
    speechRecognizer.continuous = false;
    speechRecognizer.interimResults = false;

    speechRecognizer.onstart = () => {
        isRecording = true;
        micBtn.classList.add("recording");
    };

    speechRecognizer.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
            input.value = input.value ? (input.value + " " + transcript) : transcript;
            input.focus();
        }
    };

    speechRecognizer.onerror = (e) => {
        console.warn("Lỗi nhận diện giọng nói:", e);
        isRecording = false;
        micBtn.classList.remove("recording");
    };

    speechRecognizer.onend = () => {
        isRecording = false;
        micBtn.classList.remove("recording");
    };

    micBtn?.addEventListener("click", () => {
        if (!isRecording) {
            try {
                speechRecognizer.start();
            } catch (err) {
                console.error(err);
            }
        } else {
            speechRecognizer.stop();
        }
    });
}

// ============================================================
// 4. XUẤT TÀI LIỆU (WORD & EXCEL)
// ============================================================
async function exportWordDocument(content) {
    try {
        const res = await fetch("/api/export-docx", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: content, title: "Kế Hoạch & Báo Cáo KINI AI" })
        });
        const data = await res.json();
        if (data.download_url) {
            const a = document.createElement("a");
            a.href = data.download_url;
            a.download = data.filename;
            a.click();
        }
    } catch (e) {
        alert("Lỗi xuất Word: " + e.message);
    }
}

async function exportExcelSheet(content) {
    try {
        const res = await fetch("/api/export-xlsx", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: content, title: "Du_Lieu_KINI" })
        });
        const data = await res.json();
        if (data.download_url) {
            const a = document.createElement("a");
            a.href = data.download_url;
            a.download = data.filename;
            a.click();
        }
    } catch (e) {
        alert("Lỗi xuất Excel: " + e.message);
    }
}

// ============================================================
// 5. SIÊU BỘ NHỚ KINI (LONG-TERM MEMORY)
// ============================================================
async function loadMemories() {
    const list = document.getElementById("memory-list");
    if (!list) return;
    list.innerHTML = "<p style='color:var(--text-muted);'>Đang tải danh sách ký ức...</p>";

    try {
        const res = await fetch("/api/memories");
        const data = await res.json();
        const memories = data.memories || [];

        document.getElementById("memory-badge-count").textContent = memories.length;

        if (memories.length === 0) {
            list.innerHTML = "<p style='color:var(--text-muted);'>Chưa có thông tin ghi nhớ nào. KINI sẽ tự động ghi nhớ thông tin khi bạn trò chuyện, hoặc bạn có thể tự thêm bên trên.</p>";
            return;
        }

        list.innerHTML = "";
        memories.forEach(m => {
            const item = document.createElement("div");
            item.className = "memory-item";
            item.innerHTML = `
                <span>${escapeHtml(m.fact)}</span>
                <button class="btn-delete-mem" data-id="${m.id}" title="Xóa ký ức này">✕</button>
            `;
            item.querySelector(".btn-delete-mem").addEventListener("click", () => deleteMemory(m.id));
            list.appendChild(item);
        });
    } catch (e) {
        list.innerHTML = "<p style='color:var(--danger);'>Không thể tải bộ nhớ.</p>";
    }
}

async function updateMemoryCountBadge() {
    try {
        const res = await fetch("/api/memories");
        const data = await res.json();
        const badge = document.getElementById("memory-badge-count");
        if (badge && data.memories) badge.textContent = data.memories.length;
    } catch (e) {}
}

function initMemories() {
    document.getElementById("btn-add-memory")?.addEventListener("click", async () => {
        const input = document.getElementById("input-new-memory");
        const text = input.value.trim();
        if (!text) return;
        try {
            await fetch("/api/memories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fact: text, category: "personal" })
            });
            input.value = "";
            loadMemories();
        } catch (e) {
            alert("Lỗi thêm ký ức: " + e.message);
        }
    });

    document.getElementById("btn-clear-memories")?.addEventListener("click", async () => {
        if (!confirm("Anh có chắc chắn muốn xóa toàn bộ ký ức dài hạn của KINI không?")) return;
        try {
            await fetch("/api/memories", { method: "DELETE" });
            loadMemories();
        } catch (e) {
            alert("Lỗi xóa ký ức: " + e.message);
        }
    });
}

async function deleteMemory(id) {
    try {
        await fetch(`/api/memories/${id}`, { method: "DELETE" });
        loadMemories();
    } catch (e) {
        alert("Lỗi xóa: " + e.message);
    }
}

// ============================================================
// 6. GALLERY & LIGHTBOX
// ============================================================
async function loadGallery() {
    const grid = document.getElementById("modal-gallery-grid");
    if (!grid) return;
    grid.innerHTML = "<p style='color:var(--text-muted);'>Đang tải các tác phẩm...</p>";

    try {
        const res = await fetch("/api/gallery");
        const data = await res.json();
        const items = data.gallery || [];

        if (items.length === 0) {
            grid.innerHTML = "<p style='color:var(--text-muted);grid-column:1/-1;'>Chưa có tác phẩm nào trong bộ sưu tập. Hãy gõ 'Vẽ tranh...' trong ô chat để tạo bức ảnh đầu tiên!</p>";
            return;
        }

        grid.innerHTML = "";
        items.forEach(it => {
            const img = document.createElement("img");
            img.src = it.image_url;
            img.className = "gallery-thumb";
            img.alt = it.prompt;
            img.loading = "lazy";
            img.onclick = () => openLightbox(it.image_url, it.prompt);
            grid.appendChild(img);
        });
    } catch (e) {
        grid.innerHTML = "<p style='color:var(--danger);'>Không thể tải gallery.</p>";
    }
}

function openLightbox(url, prompt) {
    const modal = document.getElementById("lightbox-overlay");
    const img = document.getElementById("lightbox-img");
    const caption = document.getElementById("lightbox-caption");
    const downloadBtn = document.getElementById("lightbox-btn-download");
    const copyBtn = document.getElementById("lightbox-btn-copy");

    img.src = url;
    caption.textContent = prompt;
    downloadBtn.href = url;
    downloadBtn.download = "kini_ai_art.jpg";

    copyBtn.onclick = () => {
        navigator.clipboard.writeText(prompt);
        copyBtn.textContent = "✓ Đã sao chép";
        setTimeout(() => copyBtn.textContent = "📋 Sao Chép Mô Tả", 2000);
    };

    modal.style.display = "flex";
    document.getElementById("lightbox-close").onclick = () => modal.style.display = "none";
    modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = "none";
    };
}

// ============================================================
// 7. CÀI ĐẶT
// ============================================================
async function loadSettings() {
    try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        if (data.gemini_api_key) {
            document.getElementById("setting-gemini-key").value = data.gemini_api_key;
        }
        if (data.custom_persona) {
            document.getElementById("setting-persona").value = data.custom_persona;
        }
    } catch (e) {}
}

function initSettings() {
    document.getElementById("btn-save-settings")?.addEventListener("click", async () => {
        const key = document.getElementById("setting-gemini-key").value.trim();
        const persona = document.getElementById("setting-persona").value.trim();
        try {
            await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ gemini_api_key: key, custom_persona: persona })
            });
            alert("Đã lưu cài đặt KINI AI thành công!");
            closeModal("modal-settings");
        } catch (e) {
            alert("Lỗi lưu cài đặt: " + e.message);
        }
    });
}

// ============================================================
// 8. QUẢN LÝ LỊCH SỬ CUỘC HỘI THOẠI
// ============================================================
async function loadConversations() {
    const list = document.getElementById("conv-list");
    if (!list) return;

    try {
        const res = await fetch("/api/conversations");
        const data = await res.json();
        const convs = data.conversations || [];

        list.innerHTML = "";
        convs.forEach(c => {
            const item = document.createElement("div");
            item.className = `conv-item ${c.id === currentConvId ? 'active' : ''}`;
            item.innerHTML = `
                <span class="conv-title">${escapeHtml(c.title)}</span>
                <button class="conv-delete-btn" title="Xóa đoạn chat">✕</button>
            `;
            item.addEventListener("click", (e) => {
                if (e.target.classList.contains("conv-delete-btn")) {
                    e.stopPropagation();
                    deleteConversation(c.id);
                    return;
                }
                switchConversation(c.id);
            });
            list.appendChild(item);
        });
    } catch (e) {}
}

async function switchConversation(convId) {
    currentConvId = convId;
    loadConversations();

    const messagesContainer = document.getElementById("chat-messages");
    messagesContainer.innerHTML = "";

    try {
        const res = await fetch(`/api/conversations/${convId}/messages`);
        const data = await res.json();
        const msgs = data.messages || [];

        if (msgs.length === 0) {
            checkInitialHero();
        } else {
            document.getElementById("hero-section").style.display = "none";
            document.getElementById("chat-viewport").style.display = "block";
            msgs.forEach(m => {
                if (m.role === "user") {
                    appendUserMessage(m.content, null);
                } else {
                    appendAssistantMessage(m.content, m.image_url);
                }
            });
        }
    } catch (e) {
        checkInitialHero();
    }
}

async function startNewChat() {
    try {
        const res = await fetch("/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Đoạn chat mới" })
        });
        const data = await res.json();
        currentConvId = data.id;
        loadConversations();
        document.getElementById("chat-messages").innerHTML = "";
        checkInitialHero();
    } catch (e) {
        currentConvId = "default";
        document.getElementById("chat-messages").innerHTML = "";
        checkInitialHero();
    }
}

async function deleteConversation(id) {
    if (!confirm("Anh có muốn xóa đoạn hội thoại này không?")) return;
    try {
        await fetch(`/api/conversations/${id}`, { method: "DELETE" });
        if (currentConvId === id) {
            startNewChat();
        } else {
            loadConversations();
        }
    } catch (e) {}
}

// ============================================================
// TIỆN ÍCH HELPER
// ============================================================
function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(text) {
    if (!text) return "";
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatMarkdown(text) {
    if (!text) return "";
    let html = escapeHtml(text);

    // Code blocks
    html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, function(match, lang, code) {
        return `<pre><code>${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Line breaks to <br>
    html = html.replace(/\n/g, '<br>');

    return html;
}
