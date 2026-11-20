// KINI AI 4.0 - Gemini 4 Hydrogen · Ultra-Complete Architecture (Real-time Grounding & Legal Precision)
let currentConvId = "default";
let selectedFile = null;
let selectedFiles = [];
let currentAudioPlayer = null;
let speechRecognizer = null;
let isRecording = false;

// === Cấu hình marked.js (Markdown renderer đẹp như ChatGPT) ===
function setupMarkdown() {
    if (typeof marked !== "undefined") {
        marked.setOptions({
            breaks: true,
            gfm: true,
            sanitize: false
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp() {
    setupMarkdown();
    initNavigationAndModals();
    initChatCore();
    initClipboardAndDragDrop();
    initSpeechToText();
    initMemories();
    initSettings();
    initGallery();
    initKeyboardShortcuts();
    initAntigravityIDE();
    loadConversations(true);
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

    // Antigravity IDE Mode vs Chat Mode Switcher
    document.getElementById("btn-mode-chat")?.addEventListener("click", () => switchViewMode("chat"));
    document.getElementById("btn-mode-ide")?.addEventListener("click", () => switchViewMode("ide"));
    document.getElementById("btn-sidebar-studio-btn")?.addEventListener("click", () => {
        closeSidebar();
        switchViewMode("ide");
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
            } else if (action === "plan") {
                input.value = "/plan Thiết kế kiến trúc hệ thống và lập kế hoạch toàn diện cho dự án ";
                input.focus();
            } else if (action === "agent") {
                input.value = "/agent Hãy tự thiết kế và lập trình hoàn chỉnh một game mini trong workspace";
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
                modelLabel.textContent = m === "flash" ? "⚡ Gemini Flash Lite" : "🧠 Gemini Pro";
                modelDropdown.classList.remove("show");
            });
        });

        document.addEventListener("click", () => {
            modelDropdown.classList.remove("show");
            if (document.getElementById("usage-flyout-card")) {
                document.getElementById("usage-flyout-card").style.display = "none";
            }
        });
    }

    // Usage Quota Flyout Panel (Chuẩn Antigravity)
    const btnUsage = document.getElementById("btn-open-usage-panel");
    const usageCard = document.getElementById("usage-flyout-card");

    if (btnUsage && usageCard) {
        btnUsage.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (usageCard.style.display === "none") {
                await refreshUsageStats();
                usageCard.style.display = "block";
            } else {
                usageCard.style.display = "none";
            }
        });

        document.addEventListener("click", (e) => {
            if (!usageCard.contains(e.target) && e.target !== btnUsage) {
                usageCard.style.display = "none";
            }
        });
    }

    // Attach File Popup Menu
    const attachBtn = document.getElementById("btn-open-attach-menu");
    const attachMenu = document.getElementById("attach-popup-menu");
    const fileInput = document.getElementById("global-file-input");
    const folderInput = document.getElementById("global-folder-input");

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

        document.getElementById("menu-attach-folder")?.addEventListener("click", () => {
            folderInput?.click();
            attachMenu.classList.remove("show");
        });

        fileInput.addEventListener("change", (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleFilesSelected(Array.from(e.target.files));
            }
        });

        folderInput?.addEventListener("change", (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleFilesSelected(Array.from(e.target.files));
            }
        });

        document.addEventListener("click", () => {
            attachMenu.classList.remove("show");
        });
    }

    // Gỡ tệp đính kèm
    document.getElementById("btn-remove-attach")?.addEventListener("click", () => {
        selectedFile = null;
        selectedFiles = [];
        fileInput.value = "";
        if (folderInput) folderInput.value = "";
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

function handleFilesSelected(files) {
    if (!files || files.length === 0) return;
    selectedFiles = files;
    selectedFile = files[0];

    const bar = document.getElementById("attachment-preview-bar");
    const nameSpan = document.getElementById("attach-name");
    const iconSpan = document.getElementById("attach-icon");

    if (files.length === 1) {
        const file = files[0];
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
    } else {
        iconSpan.textContent = "📁";
        nameSpan.textContent = `${files.length} tệp đã chọn (${files[0].name}, ...)`;
    }
    bar.style.display = "flex";
}

function handleFileSelected(file) {
    if (file) handleFilesSelected([file]);
}

// ============================================================
// HỆ THỐNG COPY, DÁN (CTRL + V) VÀ KÉO THẢ TỆP/THƯ MỤC (DRAG & DROP)
// ============================================================
function initClipboardAndDragDrop() {
    // 1. DÁN TỪ CLIPBOARD (Ctrl + V)
    window.addEventListener("paste", (e) => {
        const clipboard = e.clipboardData;
        if (!clipboard) return;

        // A. Nếu trong Clipboard có file (ví dụ: Ctrl + C một file rồi Ctrl + V vào web)
        if (clipboard.files && clipboard.files.length > 0) {
            e.preventDefault();
            const files = Array.from(clipboard.files);
            handleFilesSelected(files);
            showToast(`📋 Đã dán ${files.length} tệp từ Clipboard!`);
            return;
        }

        // B. Nếu chụp màn hình (Snipping Tool, PrtScn) hoặc copy ảnh từ trình duyệt / Word
        if (clipboard.items) {
            for (let i = 0; i < clipboard.items.length; i++) {
                const item = clipboard.items[i];
                if (item.type.indexOf("image") !== -1) {
                    const blob = item.getAsFile();
                    if (blob) {
                        e.preventDefault();
                        const ext = blob.type.split("/")[1] || "png";
                        const imageFile = new File([blob], `dan_anh_${Date.now()}.${ext}`, { type: blob.type });
                        handleFilesSelected([imageFile]);
                        showToast("📋 Đã dán hình ảnh từ Clipboard vào KINI AI!");
                        return;
                    }
                }
            }
        }
    });

    // 2. KÉO THẢ TỆP & THƯ MỤC (DRAG & DROP)
    const overlay = document.getElementById("drag-drop-overlay");
    let dragCounter = 0;

    window.addEventListener("dragenter", (e) => {
        e.preventDefault();
        dragCounter++;
        if (overlay) overlay.classList.add("active");
    });

    window.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (overlay) overlay.classList.add("active");
    });

    window.addEventListener("dragleave", (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter <= 0) {
            dragCounter = 0;
            if (overlay) overlay.classList.remove("active");
        }
    });

    window.addEventListener("drop", async (e) => {
        e.preventDefault();
        dragCounter = 0;
        if (overlay) overlay.classList.remove("active");

        const dt = e.dataTransfer;
        if (!dt) return;

        let droppedFiles = [];
        if (dt.items && dt.items.length > 0) {
            for (let i = 0; i < dt.items.length; i++) {
                const item = dt.items[i];
                if (item.webkitGetAsEntry) {
                    const entry = item.webkitGetAsEntry();
                    if (entry) {
                        const subFiles = await scanFilesFromEntry(entry);
                        droppedFiles.push(...subFiles);
                        continue;
                    }
                }
                const file = item.getAsFile ? item.getAsFile() : null;
                if (file) droppedFiles.push(file);
            }
        } else if (dt.files && dt.files.length > 0) {
            droppedFiles = Array.from(dt.files);
        }

        if (droppedFiles.length > 0) {
            handleFilesSelected(droppedFiles);
            showToast(`📂 Đã nhận ${droppedFiles.length} tệp kéo thả vào KINI AI!`);
        }
    });
}

// Đọc đệ quy tất cả các file nếu người dùng thả một thư mục vào
async function scanFilesFromEntry(entry) {
    if (entry.isFile) {
        return new Promise((resolve) => {
            entry.file((file) => resolve([file]), () => resolve([]));
        });
    } else if (entry.isDirectory) {
        const reader = entry.createReader();
        return new Promise((resolve) => {
            reader.readEntries(async (entries) => {
                let results = [];
                for (const child of entries) {
                    const subFiles = await scanFilesFromEntry(child);
                    results.push(...subFiles);
                }
                resolve(results);
            }, () => resolve([]));
        });
    }
    return [];
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
    const quickPills = document.getElementById("quick-pills-bar");

    if (!messages || messages.children.length === 0) {
        if (hero) hero.style.display = "flex";
        if (viewport) viewport.style.display = "none";
        if (quickPills) quickPills.style.display = "flex";
    } else {
        if (hero) hero.style.display = "none";
        if (viewport) viewport.style.display = "block";
        if (quickPills) quickPills.style.display = "none";
    }
}

async function sendMessage() {
    const userInput = document.getElementById("main-user-input");
    const message = userInput.value.trim();

    if (!message && (!selectedFiles || selectedFiles.length === 0)) return;

    // Chuyển từ giao diện Hero sang giao diện Chat, ẩn thanh tác vụ gợi ý bên dưới để không bị đè chữ
    document.getElementById("hero-section").style.display = "none";
    const quickPills = document.getElementById("quick-pills-bar");
    if (quickPills) quickPills.style.display = "none";
    const viewport = document.getElementById("chat-viewport");
    viewport.style.display = "block";

    // 1. Hiển thị tin nhắn người dùng ngay lập tức
    const filesToSend = [...selectedFiles];
    appendUserMessage(message, filesToSend);

    // Reset input
    userInput.value = "";
    userInput.style.height = "auto";

    selectedFile = null;
    selectedFiles = [];
    document.getElementById("attachment-preview-bar").style.display = "none";
    document.getElementById("global-file-input").value = "";
    const folderInput = document.getElementById("global-folder-input");
    if (folderInput) folderInput.value = "";

    // 2. Hiển thị loading indicator cho KINI
    const loadingId = appendLoadingMessage();

    try {
        const formData = new FormData();
        formData.append("conv_id", currentConvId);
        formData.append("message", message);
        formData.append("model_mode", document.querySelector(".model-option.active")?.dataset.model || "flash");
        
        if (filesToSend.length === 1) {
            formData.append("file", filesToSend[0]);
        } else if (filesToSend.length > 1) {
            for (const f of filesToSend) {
                formData.append("files", f);
            }
        }

        const res = await fetch("/api/chat", {
            method: "POST",
            body: formData
        });

        const data = await res.json();
        removeLoadingMessage(loadingId);

        if (data.reply) {
            appendAssistantMessage(data.reply, data.image_url, data.is_image_generated, data.model_used);
            // Cập nhật số lượng ký ức
            updateMemoryCountBadge();
            // Cập nhật danh sách hội thoại bên sidebar ngay khi có tin nhắn mới
            loadConversations(false);
            // Cập nhật lại số liệu Quota & Token thực tế
            refreshUsageStats();
        } else {
            appendAssistantMessage("⚠️ Không nhận được phản hồi từ KINI AI. Vui lòng thử lại.");
        }

    } catch (err) {
        removeLoadingMessage(loadingId);
        appendAssistantMessage("❌ Lỗi kết nối tới máy chủ KINI AI: " + err.message);
    }
}

function appendUserMessage(text, files) {
    const container = document.getElementById("chat-messages");
    const row = document.createElement("div");
    row.className = "message-row user";

    let fileHtml = "";
    if (files) {
        const fileList = Array.isArray(files) ? files : [files];
        for (const file of fileList) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
                const previewUrl = URL.createObjectURL(file);
                fileHtml += `<img src="${previewUrl}" class="msg-inline-image" style="max-height:220px; border-radius:12px; margin-bottom:6px;" alt="upload">`;
            } else {
                fileHtml += `<div style="font-size:0.85rem; opacity:0.9; margin-bottom:4px;">📎 Đính kèm tệp: <b>${escapeHtml(file.name)}</b></div>`;
            }
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

function showToast(message) {
    let toast = document.getElementById("kini-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "kini-toast";
        toast.className = "kini-toast";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);
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
            <div class="message-bubble kini-thinking">
                <div class="thinking-dots"><span></span><span></span><span></span></div>
                <span class="thinking-text">KINI đang phân tích...</span>
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

function appendAssistantMessage(content, imageUrl = "", isImageGen = false, modelUsed = "") {
    const container = document.getElementById("chat-messages");
    const row = document.createElement("div");
    row.className = "message-row assistant";

    let imgBlock = "";
    if (imageUrl) {
        imgBlock = `
            <div class="msg-image-card">
                <img src="${imageUrl}" class="msg-inline-image" alt="Artwork" onclick="openLightbox('${imageUrl}', '${escapeAttr(content)}')" loading="lazy">
                <div class="msg-image-actions">
                    <a href="${imageUrl}" download="kini_artwork.jpg" class="btn-img-action" title="Tải ảnh HD">
                        ⬇️ Tải Ảnh HD
                    </a>
                    <button class="btn-img-action" onclick="openLightbox('${imageUrl}', '${escapeAttr(content)}')" title="Phóng to ảnh">
                        🔍 Phóng to
                    </button>
                </div>
            </div>
        `;
    }

    const renderedHtml = formatMarkdown(content);
    const displayModel = modelUsed || "gemini-3.1-flash-lite";

    // Nhận diện nếu có sản phẩm do KINI Agent tạo ra trong workspace
    let agentActionsHtml = "";
    const matchPath = content.match(/workspace[\\/]([a-zA-Z0-9_\-\.]+)/i);
    const matchHtml = content.match(/workspace[\\/]([a-zA-Z0-9_\-\.\/]+\.html)/i);

    if (matchHtml && matchHtml[1]) {
        const htmlRelPath = matchHtml[1].replace(/\\/g, "/");
        agentActionsHtml += `
            <button class="btn-msg-action btn-agent-preview" onclick="openAgentWebPreview('${htmlRelPath}')" style="border-color: rgba(0, 242, 254, 0.4); color: #00f2fe; background: rgba(0, 242, 254, 0.08);" title="Chơi Game / Mở Live Web App ngay trên trình duyệt">
                <span class="action-icon">🌐</span> Chơi Trên Trình Duyệt
            </button>
        `;
    }

    if (matchPath && matchPath[1]) {
        const subFolder = matchPath[1];
        agentActionsHtml += `
            <button class="btn-msg-action btn-agent-open" onclick="openAgentFolder('${subFolder}')" style="border-color: rgba(0, 242, 254, 0.4); color: #00f2fe; background: rgba(0, 242, 254, 0.08);" title="Mở thư mục dự án trên máy tính">
                <span class="action-icon">📂</span> Mở Thư Mục
            </button>
            <button class="btn-msg-action btn-agent-launch" onclick="launchAgentApp('${subFolder}')" style="border-color: rgba(157, 78, 221, 0.4); color: #c77dff; background: rgba(157, 78, 221, 0.08);" title="Bật Game / Ứng dụng ngay lập tức">
                <span class="action-icon">🎮</span> Bật Game Ngay
            </button>
        `;
    }

    row.innerHTML = `
        <div class="message-avatar">K</div>
        <div class="message-body">
            <div class="message-bubble">
                ${renderedHtml}
                ${imgBlock}
            </div>
            <div class="msg-actions">
                <span class="msg-model-badge" title="Mô hình thực tế từ Google API">⚡ ${escapeHtml(displayModel)}</span>
                ${agentActionsHtml}
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

// ============================================================
// PHÍM TẮT BÀN PHÍM TOÀN CỤC (KEYBOARD SHORTCUTS)
// ============================================================
function initKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
        const isInInput = e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT";
        // Ctrl+N = Đoạn chat mới (chỉ khi không trong input)
        if ((e.ctrlKey || e.metaKey) && e.key === "n" && !e.shiftKey && !isInInput) {
            e.preventDefault();
            startNewChat();
            showToast("💬 Đã mở đoạn chat mới (Ctrl+N)");
        }
        // Ctrl+/ = Mở Cài đặt
        if ((e.ctrlKey || e.metaKey) && e.key === "/") {
            e.preventDefault();
            openModal("modal-settings");
            loadSettings();
            showToast("⚙️ Mở cài đặt (Ctrl+/)");
        }
        // Ctrl+Shift+M = Mở Bộ nhớ
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "M") {
            e.preventDefault();
            openModal("modal-memory");
            loadMemories();
            showToast("🧠 Mở bộ nhớ KINI (Ctrl+Shift+M)");
        }
        // Escape = Đóng modal đang mở
        if (e.key === "Escape") {
            document.querySelectorAll(".modal").forEach(m => {
                if (m.style.display !== "none") m.style.display = "none";
            });
            const lightbox = document.getElementById("lightbox-overlay");
            if (lightbox && lightbox.style.display !== "none") lightbox.style.display = "none";
        }
    });
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
// 8. QUẢN LÝ LỊCH SỬ CUỘC HỘI THOẠI (LƯU & KHÔI PHỤC TỰ ĐỘNG)
// ============================================================
async function loadConversations(autoRestore = false) {
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
            item.dataset.id = c.id;
            item.innerHTML = `
                <span class="conv-title" title="${escapeAttr(c.title)}">${escapeHtml(c.title)}</span>
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

        // Tự động khôi phục phiên trò chuyện gần nhất khi mở trang hoặc F5
        if (autoRestore) {
            const savedConvId = localStorage.getItem("kini_last_conv_id") || "default";
            if (convs.some(c => c.id === savedConvId)) {
                switchConversation(savedConvId);
            } else if (convs.length > 0) {
                switchConversation(convs[0].id);
            } else {
                checkInitialHero();
            }
        }
    } catch (e) {
        console.warn("Lỗi tải danh sách hội thoại:", e);
        if (autoRestore) checkInitialHero();
    }
}

async function switchConversation(convId) {
    currentConvId = convId;
    localStorage.setItem("kini_last_conv_id", convId);
    
    // Cập nhật trạng thái active trên danh sách sidebar mà không gây race-condition
    document.querySelectorAll(".conv-item").forEach(it => {
        if (it.dataset.id === convId) {
            it.classList.add("active");
        } else {
            it.classList.remove("active");
        }
    });

    const messagesContainer = document.getElementById("chat-messages");
    if (messagesContainer) messagesContainer.innerHTML = "";

    try {
        const res = await fetch(`/api/conversations/${convId}/messages`);
        const data = await res.json();
        const msgs = data.messages || [];

        if (msgs.length === 0) {
            checkInitialHero();
        } else {
            const hero = document.getElementById("hero-section");
            const quickPills = document.getElementById("quick-pills-bar");
            const viewport = document.getElementById("chat-viewport");
            
            if (hero) hero.style.display = "none";
            if (quickPills) quickPills.style.display = "none";
            if (viewport) viewport.style.display = "block";

            msgs.forEach(m => {
                try {
                    if (m.role === "user") {
                        appendUserMessage(m.content, m.image_url);
                    } else {
                        appendAssistantMessage(m.content, m.image_url);
                    }
                } catch(err) {
                    console.warn("Lỗi render tin nhắn:", err);
                }
            });
            scrollToBottom();
        }
    } catch (e) {
        console.warn("Lỗi tải tin nhắn hội thoại:", e);
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
        localStorage.setItem("kini_last_conv_id", currentConvId);
        await loadConversations(false);
        document.getElementById("chat-messages").innerHTML = "";
        checkInitialHero();
        showToast("💬 Đã tạo đoạn chat mới!");
    } catch (e) {
        currentConvId = "c_" + Date.now().toString(36);
        localStorage.setItem("kini_last_conv_id", currentConvId);
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
    
    // Nếu có marked.js (đã load từ CDN) thì dùng nó để render chuẩn như ChatGPT
    if (typeof marked !== "undefined") {
        try {
            // Cấu hình renderer cho code blocks với highlight.js
            const renderer = new marked.Renderer();
            renderer.code = function(code, lang) {
                let highlighted = code;
                if (typeof hljs !== "undefined") {
                    try {
                        if (lang && hljs.getLanguage(lang)) {
                            highlighted = hljs.highlight(code, { language: lang }).value;
                        } else {
                            highlighted = hljs.highlightAuto(code).value;
                        }
                    } catch(e) {
                        highlighted = escapeHtml(code);
                    }
                } else {
                    highlighted = escapeHtml(code);
                }
                const langLabel = lang ? `<span class="code-lang-label">${lang}</span>` : "";
                const codeText = code;
                return `<div class="code-block-wrapper">
                    <div class="code-block-header">
                        ${langLabel}
                        <button class="btn-copy-code" onclick="copyCodeBlock(this, \`${escapeAttr(codeText)}\`)" title="Sao chép code">📋 Sao chép</button>
                    </div>
                    <pre><code class="hljs ${lang || ''}">${highlighted}</code></pre>
                </div>`;
            };
            marked.setOptions({ renderer, breaks: true, gfm: true });
            return marked.parse(text);
        } catch(e) {
            // fallback nếu marked lỗi
        }
    }
    
    // Fallback: Regex markdown thủ công
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
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    return html;
}

// Copy code block helper
function copyCodeBlock(btn, code) {
    navigator.clipboard.writeText(code).then(() => {
        btn.textContent = "✓ Đã sao chép";
        setTimeout(() => btn.textContent = "📋 Sao chép", 2000);
    });
}


// ============================================================
// HẠN MỨC QUOTA & TOKEN THEO DÕI THỜI GIAN THỰC (CHUẨN ANTIGRAVITY)
// ============================================================
async function refreshUsageStats() {
    try {
        const res = await fetch("/api/usage");
        const data = await res.json();
        
        // Hạn mức ngày
        const dailyPercent = document.getElementById("usage-daily-percent");
        const dailyBar = document.getElementById("usage-daily-bar");
        const dailyReset = document.getElementById("usage-daily-reset");
        if (dailyPercent) dailyPercent.textContent = `${data.daily_percent}% còn lại`;
        if (dailyBar) dailyBar.style.width = `${Math.min(100, Math.max(0, data.daily_percent))}%`;
        if (dailyReset) dailyReset.textContent = `Làm mới sau: ${data.resets_in} · ${data.daily_left.toLocaleString()} / ${data.daily_limit.toLocaleString()} lượt`;

        // RPM Tốc độ phút
        const rpmPercent = document.getElementById("usage-rpm-percent");
        const rpmBar = document.getElementById("usage-rpm-bar");
        const rpmDetail = document.getElementById("usage-rpm-detail");
        if (rpmPercent) rpmPercent.textContent = `${data.rpm_percent}% còn lại`;
        if (rpmBar) rpmBar.style.width = `${Math.min(100, Math.max(0, data.rpm_percent))}%`;
        if (rpmDetail) rpmDetail.textContent = `${data.rpm_current} / ${data.rpm_limit} lượt gọi trong phút này`;

        // Tokens
        const totalTokens = document.getElementById("usage-total-tokens");
        const promptTokens = document.getElementById("usage-prompt-tokens");
        const candidateTokens = document.getElementById("usage-candidate-tokens");
        if (totalTokens) totalTokens.textContent = data.total_tokens_today.toLocaleString();
        if (promptTokens) promptTokens.textContent = data.prompt_tokens_today.toLocaleString();
        if (candidateTokens) candidateTokens.textContent = data.candidates_tokens_today.toLocaleString();
    } catch (e) {
        console.warn("Lỗi đọc Quota usage:", e);
    }
}

// ============================================================
// ĐIỀU KHIỂN AGENT TỰ HÀNH TƯƠNG TÁC MÁY TÍNH CỦA ANH TRƯỜNG
// ============================================================
window.openAgentFolder = async function(folder) {
    try {
        const res = await fetch("/api/agent/open", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({path: folder})
        });
        const data = await res.json();
        if (data.success) {
            showToast("📂 Đã mở thư mục dự án trên máy tính của anh!");
        } else {
            showToast("⚠️ " + (data.error || "Không tìm thấy thư mục"));
        }
    } catch(e) {
        showToast("❌ Lỗi: " + e.message);
    }
};

window.launchAgentApp = async function(folder) {
    try {
        const pathsToTry = [`${folder}/run_game.bat`, `${folder}/run.bat`, `${folder}/main.py`];
        for (const p of pathsToTry) {
            const res = await fetch("/api/agent/open", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({path: p})
            });
            const data = await res.json();
            if (data.success) {
                showToast("🎮 Đang khởi chạy trò chơi trên màn hình của anh...");
                return;
            }
        }
        showToast("⚠️ Không tìm thấy file chạy trong thư mục");
    } catch(e) {
        showToast("❌ Lỗi: " + e.message);
    }
};

window.openAgentWebPreview = function(relPath) {
    switchViewMode("ide");
    openIdeFile(relPath);
    setTimeout(() => {
        switchIdeEditorTab("preview");
        showToast("🌐 Đang chạy Live Web App / Game trên trình duyệt...");
    }, 200);
};

// ============================================================
// KINI ANTIGRAVITY STUDIO IDE (GENUINE SPLIT-WORKSPACE CONTROLLER)
// ============================================================
let ideCodeMirror = null;
let ideActiveFilePath = "";
let ideRawTreeNodes = [];
let ideIsMaximized = false;

function ensureIdeEditorReady() {
    const wrapper = document.getElementById("ide-codemirror-wrapper");
    if (!wrapper) return;
    
    // Nếu CodeMirror đã tải thành công từ CDN
    if (typeof CodeMirror !== "undefined" && !ideCodeMirror) {
        wrapper.innerHTML = ""; // Làm sạch container trước khi mount
        ideCodeMirror = CodeMirror(wrapper, {
            lineNumbers: true,
            theme: "material-darker",
            mode: "python",
            indentUnit: 4,
            tabSize: 4,
            lineWrapping: true,
            matchBrackets: true,
            styleActiveLine: true,
            value: "// Chọn một file từ Workspace Explorer bên trái để xem & sửa mã nguồn..."
        });

        // Lắng nghe sự kiện phím tắt trong CodeMirror
        ideCodeMirror.setOption("extraKeys", {
            "Ctrl-S": function() { saveIdeCurrentFile(); },
            "Cmd-S": function() { saveIdeCurrentFile(); },
            "Ctrl-F": function() { ideSearchPrompt(); }
        });

        ideCodeMirror.on("change", () => {
            const dirtyDot = document.getElementById("ide-tab-dirty");
            if (dirtyDot && ideActiveFilePath) dirtyDot.style.display = "inline";
        });

        ideCodeMirror.setSize("100%", "100%");
    } else if (typeof CodeMirror === "undefined" && !document.getElementById("ide-fallback-textarea")) {
        // Fallback an toàn: Textarea tiêu chuẩn với font Consolas nếu mạng chặn CDN
        wrapper.innerHTML = "";
        const ta = document.createElement("textarea");
        ta.id = "ide-fallback-textarea";
        ta.className = "ide-fallback-editor";
        ta.placeholder = "// Chọn một file từ Workspace Explorer để soạn thảo...";
        ta.addEventListener("input", () => {
            const dirtyDot = document.getElementById("ide-tab-dirty");
            if (dirtyDot && ideActiveFilePath) dirtyDot.style.display = "inline";
        });
        ta.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                saveIdeCurrentFile();
            }
        });
        wrapper.appendChild(ta);
    }
}

function getIdeCode() {
    if (ideCodeMirror) return ideCodeMirror.getValue();
    const ta = document.getElementById("ide-fallback-textarea");
    return ta ? ta.value : "";
}

function setIdeCode(content, cmMode = "python") {
    ensureIdeEditorReady();
    if (ideCodeMirror) {
        ideCodeMirror.setOption("mode", cmMode);
        ideCodeMirror.setValue(content);
        ideCodeMirror.clearHistory();
        ideCodeMirror.setSize("100%", "100%");
        setTimeout(() => ideCodeMirror.refresh(), 20);
        setTimeout(() => ideCodeMirror.refresh(), 100);
        setTimeout(() => ideCodeMirror.refresh(), 300);
    }
    const ta = document.getElementById("ide-fallback-textarea");
    if (ta) ta.value = content;
}

function initAntigravityIDE() {
    ensureIdeEditorReady();
    setupIdeEventListeners();
}

function switchViewMode(mode) {
    const appContainer = document.querySelector(".app-container");
    const btnChat = document.getElementById("btn-mode-chat");
    const btnIde = document.getElementById("btn-mode-ide");
    const studioPane = document.getElementById("antigravity-studio-pane");
    const resizerChat = document.getElementById("resizer-chat");

    if (mode === "ide") {
        appContainer.classList.add("mode-ide");
        btnChat?.classList.remove("active");
        btnIde?.classList.add("active");
        if (studioPane) studioPane.style.display = "flex";
        if (resizerChat) resizerChat.style.display = "block";
        
        // Tự động đóng menu trượt lịch sử để không chiếm không gian IDE
        document.getElementById("sidebar")?.classList.remove("open");
        document.getElementById("sidebar-overlay")?.classList.remove("open");

        loadIdeFileTree();
        ensureIdeEditorReady();
        
        // Refresh CodeMirror layout đảm bảo hiển thị 100% không bị màn hình đen
        setTimeout(() => { if (ideCodeMirror) { ideCodeMirror.setSize("100%", "100%"); ideCodeMirror.refresh(); } }, 50);
        setTimeout(() => { if (ideCodeMirror) { ideCodeMirror.setSize("100%", "100%"); ideCodeMirror.refresh(); } }, 200);
        setTimeout(() => { if (ideCodeMirror) { ideCodeMirror.setSize("100%", "100%"); ideCodeMirror.refresh(); } }, 500);

        appendTerminalLog("KINI-IDE: Chuyển sang chế độ Antigravity Studio (Code + Chat song song).", "prompt");
    } else {
        appContainer.classList.remove("mode-ide");
        btnIde?.classList.remove("active");
        btnChat?.classList.add("active");
        if (studioPane) studioPane.style.display = "none";
        if (resizerChat) resizerChat.style.display = "none";
    }
}

async function loadIdeFileTree() {
    const treeContainer = document.getElementById("ide-file-tree");
    if (!treeContainer) return;
    treeContainer.innerHTML = `<div style="padding: 12px; color: var(--text-muted); font-size: 0.8rem;">⏳ Đang đọc workspace...</div>`;

    try {
        const res = await fetch("/api/agent/workspace");
        const data = await res.json();
        if (data.success && data.tree_nodes) {
            // Lọc bỏ __pycache__ và .pyc để cây thư mục sạch sẽ chuẩn mực
            ideRawTreeNodes = data.tree_nodes.filter(n => 
                !n.path.includes("__pycache__") && 
                !n.path.endsWith(".pyc")
            );
            renderHierarchicalTree(ideRawTreeNodes);

            // Mở file mặc định nếu chưa chọn
            if (!ideActiveFilePath) {
                const defaultFile = ideRawTreeNodes.find(n => n.path === "snake_game/main.py") || ideRawTreeNodes.find(n => !n.is_dir);
                if (defaultFile) openIdeFile(defaultFile.path);
            }
        } else {
            treeContainer.innerHTML = `<div style="padding: 12px; color: var(--text-muted); font-size: 0.8rem;">Thư mục workspace đang trống</div>`;
        }
    } catch(e) {
        treeContainer.innerHTML = `<div style="padding: 12px; color: #ff0055; font-size: 0.8rem;">Lỗi nạp thư mục: ${e.message}</div>`;
    }
}

function renderHierarchicalTree(nodes) {
    const container = document.getElementById("ide-file-tree");
    if (!container) return;
    container.innerHTML = "";

    // Gom nhóm theo cấu trúc cấp bậc (Folder -> Files)
    const folders = {};
    const rootFiles = [];

    nodes.forEach(node => {
        if (node.path.includes("/")) {
            const parts = node.path.split("/");
            const topFolder = parts[0];
            if (!folders[topFolder]) folders[topFolder] = [];
            if (!node.is_dir) {
                folders[topFolder].push(node);
            }
        } else {
            if (!node.is_dir) rootFiles.push(node);
        }
    });

    // 1. Render các Folder nhóm
    Object.keys(folders).sort().forEach(folderName => {
        const folderGroup = document.createElement("div");
        folderGroup.className = "tree-folder-group";

        const folderRow = document.createElement("div");
        folderRow.className = "tree-folder-row";
        folderRow.innerHTML = `
            <span class="tree-folder-chevron">▼</span>
            <span>📁</span>
            <span class="tree-item-name">${escapeHtml(folderName)}</span>
            <div class="tree-row-actions">
                <button class="tree-act-btn btn-rename-folder" title="Đổi tên thư mục">✏️</button>
                <button class="tree-act-btn delete btn-delete-folder" title="Xóa thư mục">🗑️</button>
            </div>
        `;

        const childrenBox = document.createElement("div");
        childrenBox.className = "tree-folder-children";

        folderRow.addEventListener("click", (e) => {
            if (e.target.classList.contains("btn-rename-folder")) {
                e.stopPropagation();
                renameIdePath(folderName);
                return;
            }
            if (e.target.classList.contains("btn-delete-folder")) {
                e.stopPropagation();
                deleteIdePath(folderName);
                return;
            }
            folderRow.classList.toggle("collapsed");
        });

        // Render các file con bên trong folder
        folders[folderName].forEach(fileNode => {
            const fileRow = document.createElement("div");
            fileRow.className = "tree-file-row" + (ideActiveFilePath === fileNode.path ? " active" : "");
            fileRow.dataset.path = fileNode.path;

            const icon = getFileIcon(fileNode.ext);
            const shortName = fileNode.path.split("/").pop();

            fileRow.innerHTML = `
                <span>${icon}</span>
                <span class="tree-item-name">${escapeHtml(shortName)}</span>
                <div class="tree-row-actions">
                    <button class="tree-act-btn btn-rename-file" title="Đổi tên file">✏️</button>
                    <button class="tree-act-btn delete btn-delete-file" title="Xóa file">🗑️</button>
                </div>
            `;

            fileRow.addEventListener("click", (e) => {
                if (e.target.classList.contains("btn-rename-file")) {
                    e.stopPropagation();
                    renameIdePath(fileNode.path);
                    return;
                }
                if (e.target.classList.contains("btn-delete-file")) {
                    e.stopPropagation();
                    deleteIdePath(fileNode.path);
                    return;
                }
                document.querySelectorAll(".tree-file-row").forEach(el => el.classList.remove("active"));
                fileRow.classList.add("active");
                openIdeFile(fileNode.path);
            });

            childrenBox.appendChild(fileRow);
        });

        folderGroup.appendChild(folderRow);
        folderGroup.appendChild(childrenBox);
        container.appendChild(folderGroup);
    });

    // 2. Render các Root File
    rootFiles.forEach(fileNode => {
        const fileRow = document.createElement("div");
        fileRow.className = "tree-file-row" + (ideActiveFilePath === fileNode.path ? " active" : "");
        fileRow.dataset.path = fileNode.path;

        const icon = getFileIcon(fileNode.ext);
        fileRow.innerHTML = `
            <span>${icon}</span>
            <span class="tree-item-name">${escapeHtml(fileNode.path)}</span>
            <div class="tree-row-actions">
                <button class="tree-act-btn btn-rename-file" title="Đổi tên file">✏️</button>
                <button class="tree-act-btn delete btn-delete-file" title="Xóa file">🗑️</button>
            </div>
        `;

        fileRow.addEventListener("click", (e) => {
            if (e.target.classList.contains("btn-rename-file")) {
                e.stopPropagation();
                renameIdePath(fileNode.path);
                return;
            }
            if (e.target.classList.contains("btn-delete-file")) {
                e.stopPropagation();
                deleteIdePath(fileNode.path);
                return;
            }
            document.querySelectorAll(".tree-file-row").forEach(el => el.classList.remove("active"));
            fileRow.classList.add("active");
            openIdeFile(fileNode.path);
        });

        container.appendChild(fileRow);
    });
}

function getFileIcon(ext) {
    if (ext === ".py") return "🐍";
    if (ext === ".bat") return "⚡";
    if (ext === ".html") return "🌐";
    if (ext === ".css") return "🎨";
    if (ext === ".js" || ext === ".json") return "📜";
    if (ext === ".txt") return "📝";
    if (ext === ".md") return "📑";
    if (ext === ".csv" || ext === ".xlsx" || ext === ".xls") return "📊";
    if ([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"].includes(ext)) return "🖼️";
    return "📄";
}

async function openIdeFile(relPath) {
    ideActiveFilePath = relPath;
    const tabName = document.getElementById("ide-tab-name");
    const tabIcon = document.getElementById("ide-tab-icon");
    const dirtyDot = document.getElementById("ide-tab-dirty");

    const btnCode = document.getElementById("ide-mode-code");
    const btnPrev = document.getElementById("ide-mode-preview");
    const btnMd = document.getElementById("ide-mode-md");
    const btnImg = document.getElementById("ide-mode-img");
    const btnData = document.getElementById("ide-mode-data");

    if (tabName) tabName.textContent = relPath;
    if (dirtyDot) dirtyDot.style.display = "none";

    const ext = relPath.substring(relPath.lastIndexOf(".")).toLowerCase();
    if (tabIcon) tabIcon.textContent = getFileIcon(ext);

    // Ẩn tất cả nút chế độ đặc biệt ban đầu
    if (btnPrev) btnPrev.style.display = "none";
    if (btnMd) btnMd.style.display = "none";
    if (btnImg) btnImg.style.display = "none";
    if (btnData) btnData.style.display = "none";

    // 1. Nếu là file ẢNH (.png, .jpg, .webp, .svg, .gif)
    if ([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"].includes(ext)) {
        if (btnImg) btnImg.style.display = "inline-block";
        const imgDisplay = document.getElementById("ide-image-display");
        const imgDownload = document.getElementById("btn-download-ide-image");
        const previewUrl = `/api/agent/preview/${encodeURIComponent(relPath)}?t=${Date.now()}`;
        if (imgDisplay) imgDisplay.src = previewUrl;
        if (imgDownload) {
            imgDownload.href = previewUrl;
            imgDownload.download = relPath.split("/").pop();
        }
        switchIdeEditorTab("img");
        appendTerminalLog(`[WORKSPACE]: Mở xem ảnh '${relPath}'.`, "prompt");
        return;
    }

    // Xác định CodeMirror Mode chuẩn
    let cmMode = "python";
    if (ext === ".js" || ext === ".json") cmMode = "javascript";
    else if (ext === ".html") cmMode = "htmlmixed";
    else if (ext === ".css") cmMode = "css";
    else if (ext === ".md") cmMode = "markdown";

    setIdeCode("// Đang tải dữ liệu...", cmMode);

    try {
        const res = await fetch(`/api/agent/file?path=${encodeURIComponent(relPath)}`);
        const data = await res.json();
        if (data.success) {
            setIdeCode(data.content, cmMode);

            // 2. Nếu là HTML Web App / Game Canvas
            if (ext === ".html") {
                if (btnPrev) btnPrev.style.display = "inline-block";
                const frame = document.getElementById("ide-preview-frame");
                if (frame) frame.src = `/api/agent/preview/${encodeURIComponent(relPath)}?t=${Date.now()}`;
                switchIdeEditorTab("code");
            } 
            // 3. Nếu là Báo cáo Markdown (.md)
            else if (ext === ".md") {
                if (btnMd) btnMd.style.display = "inline-block";
                const mdBody = document.getElementById("ide-markdown-body");
                if (mdBody) {
                    mdBody.innerHTML = typeof marked !== "undefined" ? marked.parse(data.content) : `<pre>${escapeHtml(data.content)}</pre>`;
                }
                switchIdeEditorTab("code");
            }
            // 4. Nếu là File dữ liệu CSV
            else if (ext === ".csv") {
                if (btnData) btnData.style.display = "inline-block";
                renderCsvToTable(data.content);
                switchIdeEditorTab("data");
            }
            // 5. File code thông thường
            else {
                switchIdeEditorTab("code");
            }
            appendTerminalLog(`[WORKSPACE]: Mở file '${relPath}' (${data.content.length} ký tự).`, "prompt");
        } else {
            setIdeCode(`// Không thể đọc file: ${data.error}`);
            appendTerminalLog(`[LỖI]: Không thể mở '${relPath}': ${data.error}`, "error");
        }
    } catch(e) {
        setIdeCode(`// Lỗi kết nối: ${e.message}`);
        appendTerminalLog(`[LỖI]: ${e.message}`, "error");
    }
}

function renderCsvToTable(csvText) {
    const container = document.getElementById("ide-data-table-container");
    if (!container) return;
    const lines = csvText.trim().split("\n");
    if (lines.length === 0) {
        container.innerHTML = `<div style="color: var(--text-muted); padding: 12px;">Tệp dữ liệu trống</div>`;
        return;
    }

    let html = `<table class="ide-data-table"><thead><tr>`;
    const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
    headers.forEach(h => {
        html += `<th>${escapeHtml(h)}</th>`;
    });
    html += `</tr></thead><tbody>`;

    for (let i = 1; i < Math.min(lines.length, 500); i++) {
        const row = lines[i].split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
        html += `<tr>`;
        row.forEach(cell => {
            html += `<td>${escapeHtml(cell)}</td>`;
        });
        html += `</tr>`;
    }
    html += `</tbody></table>`;
    if (lines.length > 500) {
        html += `<div style="padding: 8px; color: #94a3b8; font-size: 0.8rem;">(Đang hiển thị 500 dòng đầu tiên của ${lines.length} dòng)</div>`;
    }
    container.innerHTML = html;
}

async function saveIdeCurrentFile() {
    if (!ideActiveFilePath) {
        showToast("⚠️ Chưa chọn file để lưu");
        return;
    }
    const content = getIdeCode();

    try {
        const res = await fetch("/api/agent/file", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({path: ideActiveFilePath, content: content})
        });
        const data = await res.json();
        if (data.success) {
            const dirtyDot = document.getElementById("ide-tab-dirty");
            if (dirtyDot) dirtyDot.style.display = "none";
            showToast(`💾 Đã lưu [${ideActiveFilePath}] vào đĩa thành công!`);
            appendTerminalLog(`[SUCCESS]: Đã lưu file '${ideActiveFilePath}' (${content.length} bytes).`, "success");

            // Refresh Web Preview nếu là HTML
            if (ideActiveFilePath.endsWith(".html")) {
                const frame = document.getElementById("ide-preview-frame");
                if (frame) frame.src = `/api/agent/preview/${encodeURIComponent(ideActiveFilePath)}?t=${Date.now()}`;
            }
        } else {
            showToast(`⚠️ Không thể lưu: ${data.error}`);
            appendTerminalLog(`[LỖI LƯU]: ${data.error}`, "error");
        }
    } catch(e) {
        showToast(`❌ Lỗi: ${e.message}`);
        appendTerminalLog(`[LỖI MẠNG]: ${e.message}`, "error");
    }
}

function switchIdeEditorTab(mode) {
    const btnCode = document.getElementById("ide-mode-code");
    const btnPrev = document.getElementById("ide-mode-preview");
    const btnMd = document.getElementById("ide-mode-md");
    const btnImg = document.getElementById("ide-mode-img");
    const btnData = document.getElementById("ide-mode-data");

    const codeWrapper = document.getElementById("ide-codemirror-wrapper");
    const prevWrapper = document.getElementById("ide-preview-wrapper");
    const mdWrapper = document.getElementById("ide-markdown-wrapper");
    const imgWrapper = document.getElementById("ide-image-wrapper");
    const dataWrapper = document.getElementById("ide-data-wrapper");

    // Ẩn tất cả wrappers
    if (codeWrapper) codeWrapper.style.display = "none";
    if (prevWrapper) prevWrapper.style.display = "none";
    if (mdWrapper) mdWrapper.style.display = "none";
    if (imgWrapper) imgWrapper.style.display = "none";
    if (dataWrapper) dataWrapper.style.display = "none";

    [btnCode, btnPrev, btnMd, btnImg, btnData].forEach(b => b?.classList.remove("active"));

    if (mode === "preview") {
        btnPrev?.classList.add("active");
        if (prevWrapper) prevWrapper.style.display = "flex";
    } else if (mode === "md") {
        btnMd?.classList.add("active");
        if (mdWrapper) mdWrapper.style.display = "block";
    } else if (mode === "img") {
        btnImg?.classList.add("active");
        if (imgWrapper) imgWrapper.style.display = "flex";
    } else if (mode === "data") {
        btnData?.classList.add("active");
        if (dataWrapper) dataWrapper.style.display = "block";
    } else {
        // Mặc định: code mode
        btnCode?.classList.add("active");
        if (codeWrapper) {
            codeWrapper.style.display = "flex";
            if (ideCodeMirror) {
                ideCodeMirror.setSize("100%", "100%");
                ideCodeMirror.refresh();
            }
        }
    }
}

// ------------------------------------------------------------
// CÁC THAO TÁC QUẢN LÝ TỆP & THƯ MỤC TRỰC TIẾP TRÊN WEB
// ------------------------------------------------------------
async function createIdeNewFile() {
    const fileName = prompt("📄 Nhập tên/đường dẫn file mới trong workspace (ví dụ: my_script.py hoặc app/index.html):");
    if (!fileName || !fileName.trim()) return;
    try {
        const res = await fetch("/api/agent/create_file", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({path: fileName.trim(), content: ""})
        });
        const data = await res.json();
        if (data.success) {
            showToast(`✅ Đã tạo file: ${fileName.trim()}`);
            await loadIdeFileTree();
            openIdeFile(fileName.trim());
        } else {
            showToast(`❌ Không thể tạo file: ${data.error}`);
        }
    } catch(e) {
        showToast(`❌ Lỗi: ${e.message}`);
    }
}

async function createIdeNewFolder() {
    const folderName = prompt("📁 Nhập tên thư mục mới trong workspace (ví dụ: my_project hoặc games/flappy_bird):");
    if (!folderName || !folderName.trim()) return;
    try {
        const res = await fetch("/api/agent/create_folder", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({path: folderName.trim()})
        });
        const data = await res.json();
        if (data.success) {
            showToast(`✅ Đã tạo thư mục: ${folderName.trim()}`);
            await loadIdeFileTree();
        } else {
            showToast(`❌ Không thể tạo thư mục: ${data.error}`);
        }
    } catch(e) {
        showToast(`❌ Lỗi: ${e.message}`);
    }
}

async function deleteIdePath(relPath) {
    if (!confirm(`⚠️ Anh Trường có chắc chắn muốn XÓA [${relPath}] vĩnh viễn không?`)) return;
    try {
        const res = await fetch("/api/agent/delete", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({path: relPath})
        });
        const data = await res.json();
        if (data.success) {
            showToast(`🗑️ Đã xóa: ${relPath}`);
            if (ideActiveFilePath === relPath) {
                ideActiveFilePath = "";
                setIdeCode("// Chọn một file khác từ Workspace Explorer...");
            }
            await loadIdeFileTree();
        } else {
            showToast(`❌ Không thể xóa: ${data.error}`);
        }
    } catch(e) {
        showToast(`❌ Lỗi: ${e.message}`);
    }
}

async function renameIdePath(oldPath) {
    const newPath = prompt(`✏️ Đổi tên cho [${oldPath}]:`, oldPath);
    if (!newPath || newPath.trim() === oldPath) return;
    try {
        const res = await fetch("/api/agent/rename", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({old_path: oldPath, new_path: newPath.trim()})
        });
        const data = await res.json();
        if (data.success) {
            showToast(`✏️ Đã đổi tên thành: ${newPath.trim()}`);
            if (ideActiveFilePath === oldPath) {
                ideActiveFilePath = newPath.trim();
            }
            await loadIdeFileTree();
            openIdeFile(newPath.trim());
        } else {
            showToast(`❌ Không thể đổi tên: ${data.error}`);
        }
    } catch(e) {
        showToast(`❌ Lỗi: ${e.message}`);
    }
}

function ideSearchPrompt() {
    const kw = prompt("🔍 Nhập từ khóa cần tìm trong file:");
    if (!kw) return;
    if (ideCodeMirror) {
        const text = ideCodeMirror.getValue();
        const idx = text.toLowerCase().indexOf(kw.toLowerCase());
        if (idx !== -1) {
            const posFrom = ideCodeMirror.posFromIndex(idx);
            const posTo = ideCodeMirror.posFromIndex(idx + kw.length);
            ideCodeMirror.setCursor(posFrom);
            ideCodeMirror.setSelection(posFrom, posTo);
            ideCodeMirror.focus();
            showToast(`🔎 Đã tìm thấy: "${kw}"`);
        } else {
            showToast(`⚠️ Không tìm thấy "${kw}" trong file.`);
        }
    } else {
        const ta = document.getElementById("ide-fallback-textarea");
        if (ta) {
            const idx = ta.value.toLowerCase().indexOf(kw.toLowerCase());
            if (idx !== -1) {
                ta.focus();
                ta.setSelectionRange(idx, idx + kw.length);
                showToast(`🔎 Đã tìm thấy: "${kw}"`);
            } else {
                showToast(`⚠️ Không tìm thấy "${kw}"`);
            }
        }
    }
}

function appendTerminalLog(text, type = "normal") {
    const termLogs = document.getElementById("ide-terminal-logs");
    if (!termLogs) return;
    const line = document.createElement("div");
    line.className = `term-line ${type}`;
    line.textContent = text;
    termLogs.appendChild(line);
    termLogs.scrollTop = termLogs.scrollHeight;
}

let ideListenersSetup = false;
function setupIdeEventListeners() {
    if (ideListenersSetup) return;
    ideListenersSetup = true;

    // Tìm kiếm trong cây thư mục
    document.getElementById("ide-file-search")?.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            renderHierarchicalTree(ideRawTreeNodes);
            return;
        }
        const filtered = ideRawTreeNodes.filter(n => n.path.toLowerCase().includes(query));
        renderHierarchicalTree(filtered);
    });

    // Làm mới
    document.getElementById("btn-ide-refresh")?.addEventListener("click", loadIdeFileTree);

    // Mở Explorer
    document.getElementById("btn-ide-open-explorer")?.addEventListener("click", () => {
        openAgentFolder("");
    });

    // Lưu file
    document.getElementById("btn-ide-save-file")?.addEventListener("click", saveIdeCurrentFile);

    // Chạy file
    document.getElementById("btn-ide-run-file")?.addEventListener("click", () => {
        if (!ideActiveFilePath) {
            showToast("⚠️ Chưa chọn file để chạy");
            return;
        }
        const folder = ideActiveFilePath.includes("/") ? ideActiveFilePath.substring(0, ideActiveFilePath.lastIndexOf("/")) : ideActiveFilePath;
        appendTerminalLog(`[TERMINAL]: KINI Agent đang kích hoạt chạy '${ideActiveFilePath}' trên Windows...`, "prompt");
        launchAgentApp(folder);
    });

    // Thu phóng toàn màn hình khung soạn thảo
    document.getElementById("btn-ide-maximize")?.addEventListener("click", () => {
        const pane = document.getElementById("antigravity-studio-pane");
        const chatPane = document.getElementById("chat-main-pane");
        ideIsMaximized = !ideIsMaximized;
        if (ideIsMaximized) {
            if (chatPane) chatPane.style.display = "none";
            if (pane) pane.style.flex = "1";
        } else {
            if (chatPane) chatPane.style.display = "flex";
            if (pane) pane.style.flex = "1.4";
        }
        if (ideCodeMirror) ideCodeMirror.refresh();
    });

    // Mode Switches
    document.getElementById("ide-mode-code")?.addEventListener("click", () => switchIdeEditorTab("code"));
    document.getElementById("ide-mode-preview")?.addEventListener("click", () => switchIdeEditorTab("preview"));
    document.getElementById("ide-mode-md")?.addEventListener("click", () => switchIdeEditorTab("md"));
    document.getElementById("ide-mode-img")?.addEventListener("click", () => switchIdeEditorTab("img"));
    document.getElementById("ide-mode-data")?.addEventListener("click", () => switchIdeEditorTab("data"));

    // Nút tạo File mới & Thư mục mới trên Header Explorer
    document.getElementById("btn-ide-new-file")?.addEventListener("click", createIdeNewFile);
    document.getElementById("btn-ide-new-folder")?.addEventListener("click", createIdeNewFolder);

    // Nút Copy toàn bộ mã nguồn
    document.getElementById("btn-ide-copy-code")?.addEventListener("click", () => {
        const code = getIdeCode();
        if (!code) {
            showToast("⚠️ Không có mã nguồn để sao chép");
            return;
        }
        navigator.clipboard.writeText(code).then(() => {
            showToast("📋 Đã sao chép toàn bộ mã nguồn vào Clipboard!");
        }).catch(() => {
            showToast("⚠️ Không thể sao chép");
        });
    });

    // Nút Tìm kiếm trong mã nguồn
    document.getElementById("btn-ide-search-code")?.addEventListener("click", ideSearchPrompt);

    // Terminal clear & toggle
    document.getElementById("btn-terminal-clear")?.addEventListener("click", () => {
        const termLogs = document.getElementById("ide-terminal-logs");
        if (termLogs) termLogs.innerHTML = `<div class="term-line prompt">KINI-Agent:~/workspace$ Terminal đã được làm sạch.</div>`;
    });

    document.getElementById("btn-terminal-toggle")?.addEventListener("click", () => {
        const drawer = document.getElementById("ide-terminal-drawer");
        drawer?.classList.toggle("collapsed");
        setTimeout(() => { if (ideCodeMirror) ideCodeMirror.refresh(); }, 150);
    });

    // 1. Thu gọn / Mở rộng Cây thư mục (Explorer)
    document.getElementById("btn-collapse-tree")?.addEventListener("click", () => {
        const sidebar = document.getElementById("ide-file-tree-sidebar");
        const btn = document.getElementById("btn-collapse-tree");
        if (sidebar) {
            sidebar.classList.toggle("collapsed");
            btn.textContent = sidebar.classList.contains("collapsed") ? "▶" : "◀";
            setTimeout(() => { if (ideCodeMirror) ideCodeMirror.refresh(); }, 150);
        }
    });

    // 2. Ẩn / Hiện Khung Chat bên phải
    document.getElementById("btn-toggle-chat")?.addEventListener("click", () => {
        const chatPane = document.getElementById("chat-main-pane");
        const resizerChat = document.getElementById("resizer-chat");
        const btn = document.getElementById("btn-toggle-chat");
        if (chatPane) {
            chatPane.classList.toggle("collapsed");
            const isHidden = chatPane.classList.contains("collapsed");
            btn.textContent = isHidden ? "💬 Hiện Chat" : "💬 Ẩn Chat";
            if (resizerChat) resizerChat.style.display = isHidden ? "none" : "block";
            setTimeout(() => { if (ideCodeMirror) ideCodeMirror.refresh(); }, 150);
        }
    });

    // 3. Kéo giãn thanh Explorer (resizer-tree)
    initSplitterDrag("resizer-tree", (deltaX) => {
        const sidebar = document.getElementById("ide-file-tree-sidebar");
        if (sidebar && !sidebar.classList.contains("collapsed")) {
            const currentW = sidebar.getBoundingClientRect().width;
            const newW = Math.min(500, Math.max(160, currentW + deltaX));
            sidebar.style.width = newW + "px";
            if (ideCodeMirror) ideCodeMirror.refresh();
        }
    });

    // 4. Kéo giãn thanh Terminal (resizer-terminal)
    initSplitterDrag("resizer-terminal", null, (deltaY) => {
        const drawer = document.getElementById("ide-terminal-drawer");
        if (drawer && !drawer.classList.contains("collapsed")) {
            const currentH = drawer.getBoundingClientRect().height;
            const newH = Math.min(450, Math.max(40, currentH - deltaY));
            drawer.style.height = newH + "px";
            if (ideCodeMirror) ideCodeMirror.refresh();
        }
    });

    // 5. Kéo giãn thanh Chat (resizer-chat)
    initSplitterDrag("resizer-chat", (deltaX) => {
        const chatPane = document.getElementById("chat-main-pane");
        if (chatPane && !chatPane.classList.contains("collapsed")) {
            const currentW = chatPane.getBoundingClientRect().width;
            const newW = Math.min(650, Math.max(300, currentW - deltaX));
            chatPane.style.width = newW + "px";
            if (ideCodeMirror) ideCodeMirror.refresh();
        }
    });
}

// Hàm khởi tạo kéo giãn Resizer chuột
function initSplitterDrag(resizerId, onDragX, onDragY) {
    const handle = document.getElementById(resizerId);
    if (!handle) return;

    let startX = 0, startY = 0;
    function onMouseMove(e) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        startX = e.clientX;
        startY = e.clientY;
        if (onDragX) onDragX(deltaX);
        if (onDragY) onDragY(deltaY);
    }
    function onMouseUp() {
        handle.classList.remove("dragging");
        document.body.style.cursor = "default";
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        if (ideCodeMirror) ideCodeMirror.refresh();
    }
    handle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        startX = e.clientX;
        startY = e.clientY;
        handle.classList.add("dragging");
        document.body.style.cursor = handle.classList.contains("vertical") ? "row-resize" : "col-resize";
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    });
}
