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
            } else if (action === "agent") {
                input.value = "Tạo cho anh một con game 2D bằng Python Pygame, tự động lưu vào workspace";
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
                modelLabel.textContent = m === "flash" ? "⚡ Gemini 3.8 Flash" : "🧠 Gemini 4 Pro";
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
            appendAssistantMessage(data.reply, data.image_url, data.is_image_generated);
            // Cập nhật số lượng ký ức
            updateMemoryCountBadge();
            // Cập nhật danh sách hội thoại bên sidebar ngay khi có tin nhắn mới
            loadConversations(false);
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

function appendAssistantMessage(content, imageUrl = "", isImageGen = false) {
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
            const savedConvId = localStorage.getItem("kini_last_conv_id");
            if (savedConvId && convs.some(c => c.id === savedConvId)) {
                switchConversation(savedConvId);
            } else if (convs.length > 0) {
                switchConversation(convs[0].id);
            } else {
                checkInitialHero();
            }
        }
    } catch (e) {
        if (autoRestore) checkInitialHero();
    }
}

async function switchConversation(convId) {
    currentConvId = convId;
    localStorage.setItem("kini_last_conv_id", convId);
    
    // Cập nhật trạng thái active trên danh sách sidebar
    document.querySelectorAll(".conv-item").forEach(it => {
        it.classList.remove("active");
    });
    // Tìm item ứng với convId
    const items = document.querySelectorAll(".conv-item");
    items.forEach(it => {
        // có thể cập nhật qua loadConversations() nhẹ
    });
    loadConversations(false);

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
            const quickPills = document.getElementById("quick-pills-bar");
            if (quickPills) quickPills.style.display = "none";
            document.getElementById("chat-viewport").style.display = "block";
            msgs.forEach(m => {
                if (m.role === "user") {
                    appendUserMessage(m.content, null);
                } else {
                    appendAssistantMessage(m.content, m.image_url);
                }
            });
            scrollToBottom();
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
