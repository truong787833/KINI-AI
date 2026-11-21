// Quản lý Phiên Người Dùng Độc Lập (Device / Client Isolation)
let kiniClientId = localStorage.getItem("kini_client_id");
const isLocalhostHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

if (!kiniClientId) {
    if (isLocalhostHost) {
        kiniClientId = "master";
    } else {
        kiniClientId = "usr_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    }
    localStorage.setItem("kini_client_id", kiniClientId);
}

// Tự động gắn X-Client-Id vào mọi request fetch
const _originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
    options = options || {};
    options.headers = options.headers || {};
    if (options.headers instanceof Headers) {
        if (!options.headers.has("X-Client-Id")) {
            options.headers.set("X-Client-Id", kiniClientId);
        }
    } else {
        options.headers["X-Client-Id"] = kiniClientId;
    }
    return _originalFetch(url, options);
};

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

function initGallery() {
    // Gallery modal đã được khởi tạo trong initNavigationAndModals
}

document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp() {
    try { setupMarkdown(); } catch(e) { console.error("setupMarkdown:", e); }
    try { initNavigationAndModals(); } catch(e) { console.error("initNavigationAndModals:", e); }
    try { initChatCore(); } catch(e) { console.error("initChatCore:", e); }
    try { initSlashCommands(); } catch(e) { console.error("initSlashCommands:", e); }
    try { initClipboardAndDragDrop(); } catch(e) { console.error("initClipboardAndDragDrop:", e); }
    try { initSpeechToText(); } catch(e) { console.error("initSpeechToText:", e); }
    try { initMemories(); } catch(e) { console.error("initMemories:", e); }
    try { updateMemoryCountBadge(); } catch(e) { console.error("updateMemoryCountBadge:", e); }
    try { initSettings(); } catch(e) { console.error("initSettings:", e); }
    try { initKeyboardShortcuts(); } catch(e) { console.error("initKeyboardShortcuts:", e); }
    try { initAntigravityIDE(); } catch(e) { console.error("initAntigravityIDE:", e); }
    try { loadConversations(true); } catch(e) { console.error("loadConversations:", e); }
    try { initVersionSystem(); } catch(e) { console.error("initVersionSystem:", e); }
}

// ============================================================
// 1. ĐIỀU HƯỚNG, SIDEBAR & MODALS
// ============================================================
function initNavigationAndModals() {
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebar-overlay");
    const toggleBtn = document.getElementById("btn-toggle-sidebar");
    const closeBtn = document.getElementById("btn-close-sidebar");

    // 1. Khôi phục chiều rộng & trạng thái Sidebar từ localStorage (chuẩn Google Antigravity)
    if (sidebar && window.innerWidth > 768) {
        const savedW = parseInt(localStorage.getItem("kini_sidebar_width"));
        if (savedW && savedW >= 160 && savedW <= 520) {
            sidebar.style.width = savedW + "px";
        }
        const isSavedCollapsed = localStorage.getItem("kini_sidebar_collapsed") === "1";
        if (isSavedCollapsed) {
            sidebar.classList.add("collapsed");
        }
    }

    // 2. Hàm Ẩn / Mở Sidebar
    window.toggleSidebar = function(forceOpen = null) {
        if (!sidebar) return;
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            const willOpen = forceOpen !== null ? forceOpen : !sidebar.classList.contains("open");
            if (willOpen) {
                sidebar.classList.add("open");
                sidebarOverlay?.classList.add("open");
            } else {
                sidebar.classList.remove("open");
                sidebarOverlay?.classList.remove("open");
            }
            return;
        }

        // Desktop: Kéo ra, thu lại, ẩn và mở lại
        const willCollapse = forceOpen !== null ? !forceOpen : !sidebar.classList.contains("collapsed");
        if (willCollapse) {
            sidebar.classList.add("collapsed");
            localStorage.setItem("kini_sidebar_collapsed", "1");
            showToast("◀ Đã ẩn Sidebar (Bấm nút menu ở góc trên hoặc nhấn Ctrl+B để mở lại)");
        } else {
            sidebar.classList.remove("collapsed");
            const w = parseInt(localStorage.getItem("kini_sidebar_width")) || 280;
            sidebar.style.width = w + "px";
            localStorage.setItem("kini_sidebar_collapsed", "0");
        }
        setTimeout(() => { if (ideCodeMirror) ideCodeMirror.refresh(); }, 250);
    };

    function openSidebar() {
        window.toggleSidebar(true);
    }
    function closeSidebar() {
        window.toggleSidebar(false);
    }

    if (toggleBtn) toggleBtn.addEventListener("click", () => window.toggleSidebar());
    if (closeBtn) closeBtn.addEventListener("click", () => window.toggleSidebar(false));
    if (sidebarOverlay) sidebarOverlay.addEventListener("click", () => window.toggleSidebar(false));

    // 3. Kéo giãn Sidebar (#resizer-sidebar) chuẩn Google Antigravity
    initSplitterDrag("resizer-sidebar", (deltaX) => {
        if (sidebar && !sidebar.classList.contains("collapsed") && window.innerWidth > 768) {
            sidebar.classList.add("dragging");
            const currentW = sidebar.getBoundingClientRect().width;
            const newW = Math.min(520, Math.max(160, currentW + deltaX));
            sidebar.style.width = newW + "px";
            localStorage.setItem("kini_sidebar_width", newW);
            if (ideCodeMirror) ideCodeMirror.refresh();
        }
    });

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
            if (action === "game") {
                input.value = "Lập trình một tựa game mini chơi trực tiếp trên web với đồ họa đẹp mắt và âm thanh sống động";
                input.focus();
            } else if (action === "draw") {
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

    // Model Selector Dropdown (PC & Mobile)
    const modelBadge = document.getElementById("btn-model-badge");
    const modelDropdown = document.getElementById("model-dropdown-menu");
    const modelLabel = document.getElementById("model-label");
    const mobileModelPill = document.getElementById("btn-mobile-model-pill");
    const mobileModelLabel = document.getElementById("mobile-model-label");

    if (modelDropdown) {
        if (modelBadge) {
            modelBadge.addEventListener("click", (e) => {
                e.stopPropagation();
                modelDropdown.classList.toggle("show");
            });
        }
        if (mobileModelPill) {
            mobileModelPill.addEventListener("click", (e) => {
                e.stopPropagation();
                modelDropdown.classList.toggle("show");
            });
        }

        document.querySelectorAll(".model-option").forEach(opt => {
            opt.addEventListener("click", () => {
                document.querySelectorAll(".model-option").forEach(o => o.classList.remove("active"));
                opt.classList.add("active");
                const m = opt.dataset.model;
                if (modelLabel) modelLabel.textContent = m === "flash" ? "⚡ Gemini Flash Lite" : "🧠 Gemini Pro";
                if (mobileModelLabel) mobileModelLabel.textContent = m === "flash" ? "KINI Flash 3.1" : "KINI Pro Deep";
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

    // Nút Cài đặt trên Top Nav Mobile
    document.getElementById("btn-top-settings")?.addEventListener("click", () => {
        openModal("modal-settings");
        loadSettings();
    });

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
            const menu = document.getElementById("slash-command-menu");
            if (menu && menu.style.display !== "none") {
                // Đang chọn slash command, không gửi message
                return;
            }
            e.preventDefault();
            sendMessage();
        }
    });

    sendBtn.addEventListener("click", sendMessage);
}

// ============================================================
// 2.1. SLASH COMMAND POPUP MENU (/)
// ============================================================
function initSlashCommands() {
    const userInput = document.getElementById("main-user-input");
    const menu = document.getElementById("slash-command-menu");
    if (!userInput || !menu) return;

    const items = menu.querySelectorAll(".slash-item");

    function getVisibleItems() {
        return Array.from(items).filter(it => it.style.display !== "none");
    }

    function setActiveItem(idx) {
        const visible = getVisibleItems();
        if (visible.length === 0) return;
        items.forEach(it => it.classList.remove("active"));
        const safeIdx = (idx + visible.length) % visible.length;
        visible[safeIdx].classList.add("active");
    }

    function selectCommand(cmd) {
        menu.style.display = "none";
        if (cmd === "/brain") {
            userInput.value = "";
            userInput.style.height = "auto";
            openModal("modal-memory");
            loadMemories();
        } else {
            userInput.value = cmd + " ";
            userInput.focus();
            userInput.style.height = "auto";
            userInput.style.height = Math.min(userInput.scrollHeight, 150) + "px";
        }
    }

    userInput.addEventListener("input", () => {
        const val = userInput.value;
        if (val.startsWith("/")) {
            menu.style.display = "block";
            const query = val.toLowerCase().trim();
            let hasMatch = false;
            items.forEach(it => {
                const cmd = it.getAttribute("data-cmd") || "";
                const desc = (it.getAttribute("data-desc") || "").toLowerCase();
                if (cmd.startsWith(query) || query === "/" || desc.includes(query.replace("/", ""))) {
                    it.style.display = "flex";
                    hasMatch = true;
                } else {
                    it.style.display = "none";
                }
            });
            if (hasMatch) {
                const visible = getVisibleItems();
                if (!visible.some(it => it.classList.contains("active"))) {
                    setActiveItem(0);
                }
            } else {
                menu.style.display = "none";
            }
        } else {
            menu.style.display = "none";
        }
    });

    userInput.addEventListener("keydown", (e) => {
        if (menu.style.display !== "none") {
            const visible = getVisibleItems();
            const currentIdx = visible.findIndex(it => it.classList.contains("active"));

            if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveItem(currentIdx + 1);
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveItem(currentIdx - 1);
                return;
            }
            if ((e.key === "Enter" || e.key === "Tab") && !e.shiftKey) {
                if (currentIdx !== -1 && visible[currentIdx]) {
                    e.preventDefault();
                    e.stopPropagation();
                    const cmd = visible[currentIdx].getAttribute("data-cmd");
                    selectCommand(cmd);
                    return;
                }
            }
            if (e.key === "Escape") {
                menu.style.display = "none";
                return;
            }
        }
    });

    items.forEach(it => {
        it.addEventListener("click", () => {
            const cmd = it.getAttribute("data-cmd");
            selectCommand(cmd);
        });
    });

    document.addEventListener("click", (e) => {
        if (!menu.contains(e.target) && e.target !== userInput) {
            menu.style.display = "none";
        }
    });
}

function checkInitialHero() {
    const messages = document.getElementById("chat-messages");
    const hero = document.getElementById("hero-section");
    const viewport = document.getElementById("chat-viewport");
    const quickPills = document.getElementById("quick-pills-bar");

    if (!messages || !messages.children || messages.children.length === 0) {
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
        // Ctrl+B = Ẩn / Hiện Sidebar (chuẩn VS Code & Google Antigravity)
        if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B") && !isInInput) {
            e.preventDefault();
            if (window.toggleSidebar) window.toggleSidebar();
        }
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
    list.innerHTML = "<p style='color:var(--text-muted); padding:10px;'>⏳ Đang tải danh sách ký ức...</p>";

    try {
        const res = await fetch("/api/memories");
        const data = await res.json();
        const memories = data.memories || [];

        const badge = document.getElementById("memory-badge-count");
        if (badge) badge.textContent = memories.length;

        if (memories.length === 0) {
            list.innerHTML = "<p style='color:var(--text-muted); padding:10px;'>Chưa có thông tin ghi nhớ nào. KINI sẽ tự động ghi nhớ thông tin khi bạn trò chuyện, hoặc bạn có thể tự thêm bên trên.</p>";
            return;
        }

        list.innerHTML = "";
        memories.forEach(m => {
            const item = document.createElement("div");
            item.className = "memory-item";
            const memText = m.value || m.fact || m.key || "";
            const cat = m.category || "personal";
            item.innerHTML = `
                <div class="memory-content-box">
                    <span class="memory-key-tag">[${escapeHtml(cat)}]</span>
                    <span class="memory-text">${escapeHtml(memText)}</span>
                </div>
                <div class="memory-actions">
                    <button class="btn-edit-mem" title="Chỉnh sửa ký ức này">✏️ Sửa</button>
                    <button class="btn-delete-mem" title="Xóa ký ức này">🗑️ Xóa</button>
                </div>
            `;
            item.querySelector(".btn-edit-mem").addEventListener("click", () => editMemory(m.id, memText, cat));
            item.querySelector(".btn-delete-mem").addEventListener("click", () => deleteMemory(m.id));
            list.appendChild(item);
        });
    } catch (e) {
        list.innerHTML = "<p style='color:var(--danger); padding:10px;'>Không thể tải bộ nhớ: " + escapeHtml(e.message) + "</p>";
    }
}

async function editMemory(id, oldText, category) {
    const newText = prompt("✏️ Chỉnh sửa nội dung ký ức:", oldText);
    if (!newText || newText.trim() === oldText) return;
    try {
        const res = await fetch(`/api/memories/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: newText.trim(), value: newText.trim(), fact: newText.trim(), category: category || "personal" })
        });
        const data = await res.json();
        if (data.success) {
            showToast("✅ Đã cập nhật ký ức thành công!");
            await loadMemories();
            await updateMemoryCountBadge();
        } else {
            alert("Lỗi sửa ký ức: " + (data.detail || data.error || "Không thành công"));
        }
    } catch(e) {
        alert("Lỗi kết nối: " + e.message);
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
        const text = input ? input.value.trim() : "";
        if (!text) return;
        try {
            const res = await fetch("/api/memories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: text, value: text, fact: text, category: "personal" })
            });
            const data = await res.json();
            if (data.success || data.id) {
                input.value = "";
                showToast("🧠 Đã thêm ký ức mới thành công!");
                await loadMemories();
                await updateMemoryCountBadge();
            } else {
                alert("Lỗi thêm ký ức: " + (data.detail || data.error));
            }
        } catch (e) {
            alert("Lỗi thêm ký ức: " + e.message);
        }
    });

    document.getElementById("btn-clear-memories")?.addEventListener("click", async () => {
        if (!confirm("Anh có chắc chắn muốn xóa toàn bộ ký ức dài hạn của KINI không?")) return;
        try {
            await fetch("/api/memories", { method: "DELETE" });
            showToast("🗑️ Đã xóa toàn bộ ký ức!");
            await loadMemories();
            await updateMemoryCountBadge();
        } catch (e) {
            alert("Lỗi xóa ký ức: " + e.message);
        }
    });
}

async function deleteMemory(id) {
    if (!confirm("Anh có chắc muốn xóa ký ức này không?")) return;
    try {
        const res = await fetch(`/api/memories/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
            showToast("🗑️ Đã xóa ký ức!");
            await loadMemories();
            await updateMemoryCountBadge();
        }
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

        // Tự động nhắc người dùng mới nhập API Key miễn phí trong lần đầu chạy
        if (!data.has_api_key && !data.gemini_api_key && !localStorage.getItem("kini_onboarding_shown")) {
            localStorage.setItem("kini_onboarding_shown", "1");
            setTimeout(() => {
                openModal("modal-settings");
            }, 800);
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
// HỆ THỐNG PHIÊN BẢN & CẬP NHẬT OTA (CHUẨN GOOGLE ANTIGRAVITY)
// ============================================================
let currentSystemVersion = "4.1.0";
let latestSystemVersion = "4.2.0";

async function initVersionSystem() {
    const btnRestartUpdate = document.getElementById("btn-restart-update");
    const settingsVerEl = document.getElementById("settings-current-ver");

    try {
        const res = await fetch("/api/system/version");
        const data = await res.json();
        currentSystemVersion = data.version || "4.1.0";
        latestSystemVersion = data.latest_version || "4.2.0";

        if (settingsVerEl) settingsVerEl.textContent = "v" + currentSystemVersion;

        // Nếu có bản cập nhật mới -> Hiện nút 'Restart to Update →' chuẩn Antigravity
        if (data.has_update) {
            if (btnRestartUpdate) {
                btnRestartUpdate.style.display = "inline-flex";
            }
            const currV = document.getElementById("update-curr-ver");
            const newV = document.getElementById("update-new-ver");
            const list = document.getElementById("update-changelog-list");
            if (currV) currV.textContent = "v" + currentSystemVersion;
            if (newV) newV.textContent = "v" + latestSystemVersion;
            if (list && data.changelog) {
                list.innerHTML = data.changelog.map(item => `<li>${escapeHtml(item)}</li>`).join("");
            }
        } else {
            if (btnRestartUpdate) btnRestartUpdate.style.display = "none";
        }
    } catch (e) {
        console.warn("Lỗi kiểm tra phiên bản hệ thống:", e);
    }

    // Sự kiện bấm nút "Restart to Update →" trên Navbar
    btnRestartUpdate?.addEventListener("click", () => {
        openModal("modal-update");
    });

    // Sự kiện bấm nút "Restart & Update Now" trong Modal
    document.getElementById("btn-confirm-apply-update")?.addEventListener("click", async () => {
        const progContainer = document.getElementById("update-progress-container");
        const progFill = document.getElementById("update-progress-fill");
        const progStatus = document.getElementById("update-progress-status");
        const btnConfirm = document.getElementById("btn-confirm-apply-update");
        const btnCancel = document.getElementById("btn-cancel-update");

        if (progContainer) progContainer.style.display = "block";
        if (btnConfirm) btnConfirm.disabled = true;
        if (btnCancel) btnCancel.disabled = true;

        progFill.style.width = "25%";
        progStatus.textContent = "📦 Đang tải gói OTA từ máy chủ...";
        await new Promise(r => setTimeout(r, 600));

        progFill.style.width = "65%";
        progStatus.textContent = "⚡ Đang xác thực tệp tin và đồng bộ cơ sở dữ liệu...";
        await new Promise(r => setTimeout(r, 700));

        try {
            const res = await fetch("/api/system/apply-update", { method: "POST" });
            const data = await res.json();
            progFill.style.width = "100%";
            progStatus.textContent = "🎉 Cập nhật thành công! Đang khởi động lại KINI AI...";
            await new Promise(r => setTimeout(r, 800));

            showToast("🚀 KINI AI đã được nâng cấp lên phiên bản " + (data.new_version || latestSystemVersion) + "!");
            closeModal("modal-update");
            if (btnRestartUpdate) btnRestartUpdate.style.display = "none";
            setTimeout(() => {
                window.location.reload();
            }, 600);
        } catch(err) {
            progStatus.textContent = "❌ Lỗi cập nhật: " + err.message;
            if (btnConfirm) btnConfirm.disabled = false;
            if (btnCancel) btnCancel.disabled = false;
        }
    });

    // Nút Kiểm tra bản mới trong Cài đặt
    document.getElementById("btn-settings-check-update")?.addEventListener("click", async () => {
        try {
            const res = await fetch("/api/system/check-update", { method: "POST" });
            const data = await res.json();
            if (data.has_update) {
                showToast("🚀 Phát hiện phiên bản mới: v" + data.latest_version + "! Nút 'Restart to Update' đã xuất hiện.");
                if (btnRestartUpdate) btnRestartUpdate.style.display = "inline-flex";
            } else {
                showToast("✨ Bạn đang ở phiên bản mới nhất (v" + data.current_version + ")!");
            }
        } catch(err) {
            showToast("❌ Lỗi kiểm tra: " + err.message);
        }
    });

    // Nút Thử nghiệm bật/tắt demo update trong Cài đặt
    document.getElementById("btn-toggle-demo-update")?.addEventListener("click", async () => {
        try {
            const res = await fetch("/api/system/toggle-demo-update", { method: "POST" });
            const data = await res.json();
            if (data.has_update) {
                showToast("🧪 Đã BẬT nút 'Restart to Update' để thử nghiệm!");
            } else {
                showToast("🧪 Đã TẮT nút 'Restart to Update'!");
            }
            await initVersionSystem();
        } catch(err) {
            showToast("❌ Lỗi: " + err.message);
        }
    });
}

// ============================================================
// 8. QUẢN LÝ LỊCH SỬ CUỘC HỘI THOẠI (CHUẨN GOOGLE ANTIGRAVITY)
// ============================================================
function formatRelativeTime(dateStr) {
    if (!dateStr) return "";
    try {
        const cleanStr = String(dateStr).replace(" ", "T");
        const d = new Date(cleanStr);
        if (isNaN(d.getTime())) return "gần đây";
        const now = new Date();
        const diffMs = now - d;
        if (diffMs < 0) return "vừa xong";
        const diffSec = Math.floor(diffMs / 1000);
        if (diffSec < 60) return "vừa xong";
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return `${diffMin}m`;
        const diffHours = Math.floor(diffMin / 60);
        if (diffHours < 24) return `${diffHours}h`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 30) return `${diffDays}d`;
        const diffMonths = Math.floor(diffDays / 30);
        return `${diffMonths}mo`;
    } catch (e) {
        return "gần đây";
    }
}

function renderPinnedItem(c) {
    const item = document.createElement("div");
    item.className = `conv-item pinned-style ${c.id === currentConvId ? 'active' : ''}`;
    item.dataset.id = c.id;
    const timeStr = formatRelativeTime(c.updated_at || c.created_at);
    const categoryTag = c.category ? `📁 ${escapeHtml(c.category)}` : "📁 haitruong";

    item.innerHTML = `
        <div class="conv-row-top">
            <span class="conv-title" title="${escapeAttr(c.title)}">${escapeHtml(c.title)}</span>
            <span class="conv-time">${timeStr}</span>
            <div class="conv-actions">
                <button class="conv-act-btn btn-pin-conv" title="Bỏ ghim">📍</button>
                <button class="conv-act-btn btn-rename-conv" title="Đổi tên">✏️</button>
                <button class="conv-act-btn delete btn-delete-conv" title="Xóa vĩnh viễn">🗑️</button>
            </div>
        </div>
        <div class="conv-meta-folder">${categoryTag}</div>
    `;

    item.addEventListener("click", (e) => {
        if (e.target.closest(".btn-pin-conv")) {
            e.stopPropagation();
            togglePinConversation(c.id);
            return;
        }
        if (e.target.closest(".btn-rename-conv")) {
            e.stopPropagation();
            renameConversationPrompt(c.id, c.title);
            return;
        }
        if (e.target.closest(".btn-delete-conv")) {
            e.stopPropagation();
            deleteConversation(c.id);
            return;
        }
        switchConversation(c.id);
    });
    return item;
}

function renderProjectItem(c) {
    const item = document.createElement("div");
    item.className = `conv-item project-item ${c.id === currentConvId ? 'active' : ''}`;
    item.dataset.id = c.id;
    const timeStr = formatRelativeTime(c.updated_at || c.created_at);

    item.innerHTML = `
        <span class="conv-title" title="${escapeAttr(c.title)}">${escapeHtml(c.title)}</span>
        <span class="conv-time">${timeStr}</span>
        <div class="conv-actions">
            <button class="conv-act-btn btn-pin-conv" title="Ghim lên đầu">📌</button>
            <button class="conv-act-btn btn-rename-conv" title="Đổi tên">✏️</button>
            <button class="conv-act-btn delete btn-delete-conv" title="Xóa vĩnh viễn">🗑️</button>
        </div>
    `;

    item.addEventListener("click", (e) => {
        if (e.target.closest(".btn-pin-conv")) {
            e.stopPropagation();
            togglePinConversation(c.id);
            return;
        }
        if (e.target.closest(".btn-rename-conv")) {
            e.stopPropagation();
            renameConversationPrompt(c.id, c.title);
            return;
        }
        if (e.target.closest(".btn-delete-conv")) {
            e.stopPropagation();
            deleteConversation(c.id);
            return;
        }
        switchConversation(c.id);
    });
    return item;
}

async function loadConversations(autoRestore = false) {
    const list = document.getElementById("conv-list");
    if (!list) return;

    try {
        const res = await fetch("/api/conversations");
        const data = await res.json();
        const convs = data.conversations || [];

        list.innerHTML = "";

        const pinned = convs.filter(c => c.is_pinned);
        const unpinned = convs.filter(c => !c.is_pinned);

        // 1. Phân mục Pinned Conversations (Đã ghim chuẩn Antigravity)
        if (pinned.length > 0) {
            const pinHeader = document.createElement("div");
            pinHeader.className = "sidebar-section-title";
            pinHeader.innerHTML = `<span>Pinned Conversations</span><span>${pinned.length}</span>`;
            list.appendChild(pinHeader);

            const pinGroup = document.createElement("div");
            pinGroup.className = "conv-group";
            pinned.forEach(c => {
                try { pinGroup.appendChild(renderPinnedItem(c)); } catch(err) { console.error(err); }
            });
            list.appendChild(pinGroup);
        }

        // 2. Phân mục Projects / Thư mục dự án chuẩn Antigravity
        const projHeader = document.createElement("div");
        projHeader.className = "sidebar-section-title";
        projHeader.innerHTML = `<span>Projects</span><span style="opacity:0.5; font-size:0.75rem;">☰ 📁+</span>`;
        list.appendChild(projHeader);

        // Gom nhóm theo category (Thư mục dự án)
        const categories = {};
        unpinned.forEach(c => {
            const cat = c.category || "haitruong";
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(c);
        });

        for (const [catName, convArray] of Object.entries(categories)) {
            const folderTitle = document.createElement("div");
            folderTitle.className = "project-folder-title";
            folderTitle.innerHTML = `<span class="folder-icon">📁</span> <span class="folder-name">${escapeHtml(catName)}</span>`;
            list.appendChild(folderTitle);

            const folderGroup = document.createElement("div");
            folderGroup.className = "project-folder-group";
            convArray.forEach(c => {
                try { folderGroup.appendChild(renderProjectItem(c)); } catch(err) { console.error(err); }
            });
            list.appendChild(folderGroup);
        }

        // Tự động khôi phục phiên trò chuyện gần nhất khi mở trang hoặc F5
        if (autoRestore) {
            const savedConvId = localStorage.getItem("kini_last_conv_id");
            if (savedConvId && convs.some(c => c.id === savedConvId)) {
                await switchConversation(savedConvId);
            } else if (convs.length > 0) {
                await switchConversation(convs[0].id);
            } else {
                currentConvId = "conv_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
                localStorage.setItem("kini_last_conv_id", currentConvId);
                checkInitialHero();
            }
        }
    } catch (e) {
        console.warn("Lỗi tải danh sách hội thoại:", e);
        if (autoRestore) checkInitialHero();
    }
}

async function switchConversation(convId) {
    if (!convId) return;
    currentConvId = convId;
    localStorage.setItem("kini_last_conv_id", convId);

    // Cập nhật trạng thái active trong sidebar
    document.querySelectorAll(".conv-item").forEach(item => {
        if (item.dataset.id === convId) {
            item.classList.add("active");
            // Cập nhật Breadcrumb trên Top Navbar chuẩn Google Antigravity
            const titleSpan = item.querySelector(".conv-title");
            const crumbConv = document.getElementById("crumb-conv-title");
            if (titleSpan && crumbConv) {
                crumbConv.textContent = titleSpan.textContent;
            }
        } else {
            item.classList.remove("active");
        }
    });

    const messagesContainer = document.getElementById("chat-messages");
    if (!messagesContainer) return;

    // Xóa tin nhắn cũ và hiện biểu tượng đang tải
    messagesContainer.innerHTML = "";
    const loadingId = appendLoadingMessage();

    try {
        const res = await fetch(`/api/conversations/${convId}/messages`);
        const data = await res.json();
        const messages = data.messages || [];

        removeLoadingMessage(loadingId);
        messagesContainer.innerHTML = "";

        if (messages.length === 0) {
            checkInitialHero();
        } else {
            const hero = document.getElementById("hero-section");
            const viewport = document.getElementById("chat-viewport");
            const quickPills = document.getElementById("quick-pills-bar");
            if (hero) hero.style.display = "none";
            if (viewport) viewport.style.display = "block";
            if (quickPills) quickPills.style.display = "none";

            for (const msg of messages) {
                if (msg.role === "user") {
                    appendUserMessage(msg.content);
                } else {
                    appendAssistantMessage(msg.content, msg.image_url || "");
                }
            }
            scrollToBottom();
        }
    } catch (err) {
        removeLoadingMessage(loadingId);
        showToast("❌ Lỗi tải tin nhắn: " + err.message);
        checkInitialHero();
    }
}

async function startNewChat() {
    try {
        const res = await fetch("/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Cuộc trò chuyện mới" })
        });
        const data = await res.json();
        const newConvId = data.id || ("conv_" + Date.now());

        currentConvId = newConvId;
        localStorage.setItem("kini_last_conv_id", newConvId);

        const messagesContainer = document.getElementById("chat-messages");
        if (messagesContainer) messagesContainer.innerHTML = "";
        checkInitialHero();

        await loadConversations(false);
        showToast("💬 Đã tạo cuộc trò chuyện mới!");
    } catch (e) {
        const fallbackId = "conv_" + Date.now();
        currentConvId = fallbackId;
        localStorage.setItem("kini_last_conv_id", fallbackId);
        const messagesContainer = document.getElementById("chat-messages");
        if (messagesContainer) messagesContainer.innerHTML = "";
        checkInitialHero();
        await loadConversations(false);
    }
}

async function togglePinConversation(convId) {
    try {
        const res = await fetch(`/api/conversations/${convId}/pin`, { method: "POST" });
        const data = await res.json();
        if (data.success) {
            showToast(data.is_pinned ? "📌 Đã ghim hội thoại lên đầu!" : "📍 Đã bỏ ghim hội thoại.");
            await loadConversations(false);
        }
    } catch(e) {
        showToast("❌ Lỗi: " + e.message);
    }
}

async function renameConversationPrompt(convId, oldTitle) {
    const newTitle = prompt("✏️ Nhập tên mới cho đoạn hội thoại:", oldTitle);
    if (!newTitle || newTitle.trim() === oldTitle) return;
    try {
        const res = await fetch(`/api/conversations/${convId}/rename`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: newTitle.trim() })
        });
        const data = await res.json();
        if (data.success) {
            showToast("✏️ Đã đổi tên đoạn hội thoại!");
            await loadConversations(false);
        }
    } catch(e) {
        showToast("❌ Lỗi: " + e.message);
    }
}

async function deleteConversation(id) {
    if (!confirm("⚠️ Anh Trường có chắc chắn muốn XÓA VĨNH VIỄN đoạn hội thoại này không?\n(Chỉ khi anh bấm Xóa thì hệ thống mới xóa vĩnh viễn khỏi SQLite)")) return;
    try {
        await fetch(`/api/conversations/${id}`, { method: "DELETE" });
        showToast("🗑️ Đã xóa vĩnh viễn đoạn hội thoại!");
        if (currentConvId === id) {
            await startNewChat();
        } else {
            await loadConversations(false);
        }
    } catch (e) {
        showToast("❌ Lỗi xóa: " + e.message);
    }
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

window.__KINI_ARTIFACTS = window.__KINI_ARTIFACTS || {};

window.launchArtifactRunner = function(artifactIdOrBtn) {
    let code = "";
    let lang = "html";
    if (typeof artifactIdOrBtn === "string" && window.__KINI_ARTIFACTS[artifactIdOrBtn]) {
        code = window.__KINI_ARTIFACTS[artifactIdOrBtn].code;
        lang = window.__KINI_ARTIFACTS[artifactIdOrBtn].lang || "html";
    } else if (artifactIdOrBtn && artifactIdOrBtn.nodeType) {
        const wrapper = artifactIdOrBtn.closest(".code-block-wrapper");
        code = wrapper ? wrapper.querySelector("code")?.textContent || "" : "";
        const label = wrapper ? wrapper.querySelector(".code-lang-label")?.textContent : "";
        lang = label || "html";
    }

    if (!code) return;

    switchViewMode("ide");
    switchIdeEditorTab("preview");

    const frame = document.getElementById("ide-preview-frame");
    const previewTitle = document.getElementById("ide-preview-title");
    const isJs = (lang && (lang.toLowerCase() === "js" || lang.toLowerCase() === "javascript")) || (!code.includes("<html") && !code.includes("<!DOCTYPE") && (code.includes("canvas") || code.includes("function") || code.includes("const ") || code.includes("let ")));

    if (previewTitle) {
        previewTitle.textContent = isJs ? "🎮 Game/Script Runner (Canvas JS)" : "🌐 Live Web App Artifact";
    }

    if (frame) {
        if (isJs) {
            frame.removeAttribute("src");
            frame.srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:12px;background:#0d1117;color:#f8fafc;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:95vh;}canvas{background:#000;border:1px solid #334155;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.5);display:block;}</style></head><body><canvas id="canvas" width="600" height="400"></canvas><script>${code}<\/script></body></html>`;
        } else {
            frame.removeAttribute("src");
            frame.srcdoc = code;
        }
    }
    setIdeCode(code, isJs ? "javascript" : "htmlmixed");
    const tabName = document.getElementById("ide-tab-name");
    if (tabName) tabName.textContent = isJs ? "artifact_runner.js" : "artifact_runner.html";
    const btnPrev = document.getElementById("ide-mode-preview");
    if (btnPrev) btnPrev.style.display = "inline-block";
    showToast("🎮 Đã nạp vào Live Web/Game Runner!");
    appendTerminalLog("[RUNNER]: Khởi chạy Live Web/Game Runner từ tin nhắn chat.", "success");
};

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
                const artifactId = "art_" + Math.random().toString(36).substring(2, 9);
                window.__KINI_ARTIFACTS[artifactId] = { code, lang: lang || "html" };

                const isRunnerCandidate = (lang && ['html', 'htm', 'xml', 'js', 'javascript', 'canvas'].includes(lang.toLowerCase())) ||
                                          code.includes('<canvas') || code.includes('<!DOCTYPE') || code.includes('<html');
                const runnerBtn = isRunnerCandidate ? `<button class="btn-run-artifact" onclick="launchArtifactRunner('${artifactId}')" title="Mở trực tiếp trên Web Preview & Game Runner">🎮 Mở Web/Game Runner</button>` : "";

                return `<div class="code-block-wrapper">
                    <div class="code-block-header">
                        ${langLabel}
                        <div style="display:flex;align-items:center;">
                            ${runnerBtn}
                            <button class="btn-copy-code" onclick="copyCodeBlock(this, \`${escapeAttr(codeText)}\`)" title="Sao chép code">📋 Sao chép</button>
                        </div>
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
        const artifactId = "art_" + Math.random().toString(36).substring(2, 9);
        window.__KINI_ARTIFACTS[artifactId] = { code: code.trim(), lang: lang || "html" };
        const isRunnerCandidate = (lang && ['html', 'htm', 'xml', 'js', 'javascript', 'canvas'].includes(lang.toLowerCase())) ||
                                  code.includes('<canvas') || code.includes('<!DOCTYPE') || code.includes('<html');
        const runnerBtn = isRunnerCandidate ? `<button class="btn-run-artifact" onclick="launchArtifactRunner('${artifactId}')" title="Mở trực tiếp trên Web Preview & Game Runner">🎮 Mở Web/Game Runner</button>` : "";
        return `<div class="code-block-wrapper">
            <div class="code-block-header">
                <span class="code-lang-label">${lang || ''}</span>
                <div style="display:flex;align-items:center;">
                    ${runnerBtn}
                    <button class="btn-copy-code" onclick="copyCodeBlock(this, \`${escapeAttr(code.trim())}\`)">📋 Sao chép</button>
                </div>
            </div>
            <pre><code>${code.trim()}</code></pre>
        </div>`;
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
                <button class="tree-act-btn btn-rename-folder" title="Đổi tên thư mục">✏️ Đổi tên</button>
                <button class="tree-act-btn delete btn-delete-folder" title="Xóa thư mục">🗑️ Xóa</button>
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
                    <button class="tree-act-btn btn-rename-file" title="Đổi tên file">✏️ Đổi tên</button>
                    <button class="tree-act-btn delete btn-delete-file" title="Xóa file">🗑️ Xóa</button>
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
                <button class="tree-act-btn btn-rename-file" title="Đổi tên file">✏️ Đổi tên</button>
                <button class="tree-act-btn delete btn-delete-file" title="Xóa file">🗑️ Xóa</button>
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
                const previewTitle = document.getElementById("ide-preview-title");
                if (previewTitle) previewTitle.textContent = `🎮 Web Runner: ${relPath}`;
                if (frame) {
                    frame.removeAttribute("srcdoc");
                    frame.src = `/api/workspace/raw?path=${encodeURIComponent(relPath)}&t=${Date.now()}`;
                }
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
                if (frame) {
                    frame.removeAttribute("srcdoc");
                    frame.src = `/api/workspace/raw?path=${encodeURIComponent(ideActiveFilePath)}&t=${Date.now()}`;
                }
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
        let res = await fetch("/api/workspace/create-file", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({path: fileName.trim(), content: ""})
        });
        if (!res.ok && res.status === 404) {
            res = await fetch("/api/agent/create_file", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({path: fileName.trim(), content: ""})
            });
        }
        const data = await res.json();
        if (data.success) {
            showToast(`✅ Đã tạo file: ${fileName.trim()}`);
            await loadIdeFileTree();
            openIdeFile(fileName.trim());
        } else {
            showToast(`❌ Không thể tạo file: ${data.detail || data.error || 'Lỗi không xác định'}`);
        }
    } catch(e) {
        showToast(`❌ Lỗi: ${e.message}`);
    }
}

async function createIdeNewFolder() {
    const folderName = prompt("📁 Nhập tên thư mục mới trong workspace (ví dụ: my_project hoặc games/flappy_bird):");
    if (!folderName || !folderName.trim()) return;
    try {
        let res = await fetch("/api/workspace/create-folder", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({path: folderName.trim()})
        });
        if (!res.ok && res.status === 404) {
            res = await fetch("/api/agent/create_folder", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({path: folderName.trim()})
            });
        }
        const data = await res.json();
        if (data.success) {
            showToast(`✅ Đã tạo thư mục: ${folderName.trim()}`);
            await loadIdeFileTree();
        } else {
            showToast(`❌ Không thể tạo thư mục: ${data.detail || data.error || 'Lỗi không xác định'}`);
        }
    } catch(e) {
        showToast(`❌ Lỗi: ${e.message}`);
    }
}

async function deleteIdePath(relPath) {
    if (!confirm(`⚠️ Anh Trường có chắc chắn muốn XÓA [${relPath}] vĩnh viễn không?`)) return;
    try {
        let res = await fetch("/api/workspace/delete", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({path: relPath})
        });
        if (!res.ok && res.status === 404) {
            res = await fetch("/api/agent/delete", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({path: relPath})
            });
        }
        const data = await res.json();
        if (data.success) {
            showToast(`🗑️ Đã xóa: ${relPath}`);
            if (ideActiveFilePath === relPath) {
                ideActiveFilePath = "";
                setIdeCode("// Chọn một file khác từ Workspace Explorer...");
            }
            await loadIdeFileTree();
        } else {
            showToast(`❌ Không thể xóa: ${data.detail || data.error || 'Lỗi không xác định'}`);
        }
    } catch(e) {
        showToast(`❌ Lỗi: ${e.message}`);
    }
}

async function renameIdePath(oldPath) {
    const newPath = prompt(`✏️ Đổi tên cho [${oldPath}]:`, oldPath);
    if (!newPath || newPath.trim() === oldPath) return;
    try {
        let res = await fetch("/api/workspace/rename", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({old_path: oldPath, new_path: newPath.trim()})
        });
        if (!res.ok && res.status === 404) {
            res = await fetch("/api/agent/rename", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({old_path: oldPath, new_path: newPath.trim()})
            });
        }
        const data = await res.json();
        if (data.success) {
            showToast(`✏️ Đã đổi tên thành: ${newPath.trim()}`);
            if (ideActiveFilePath === oldPath) {
                ideActiveFilePath = newPath.trim();
            }
            await loadIdeFileTree();
            openIdeFile(newPath.trim());
        } else {
            showToast(`❌ Không thể đổi tên: ${data.detail || data.error || 'Lỗi không xác định'}`);
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

    // Các nút thao tác Web & Game Runner Preview Toolbar
    document.getElementById("btn-preview-reload")?.addEventListener("click", () => {
        const frame = document.getElementById("ide-preview-frame");
        if (!frame) return;
        if (frame.srcdoc) {
            const currentDoc = frame.srcdoc;
            frame.srcdoc = "";
            setTimeout(() => { frame.srcdoc = currentDoc; }, 50);
        } else if (frame.src && frame.src !== "about:blank") {
            const currentUrl = frame.src.split("?")[0];
            frame.src = `${currentUrl}?t=${Date.now()}`;
        }
        showToast("🔄 Đã tải lại Web/Game Runner!");
    });

    document.getElementById("btn-preview-fullscreen")?.addEventListener("click", () => {
        const wrapper = document.getElementById("ide-preview-wrapper");
        if (!wrapper) return;
        if (!document.fullscreenElement) {
            wrapper.requestFullscreen().catch(() => {
                showToast("⚠️ Không thể kích hoạt toàn màn hình");
            });
        } else {
            document.exitFullscreen();
        }
    });

    document.getElementById("btn-preview-newtab")?.addEventListener("click", () => {
        const frame = document.getElementById("ide-preview-frame");
        if (!frame) return;
        if (ideActiveFilePath && ideActiveFilePath.endsWith(".html")) {
            window.open(`/api/workspace/raw?path=${encodeURIComponent(ideActiveFilePath)}`, "_blank");
        } else if (frame.src && frame.src !== "about:blank") {
            window.open(frame.src, "_blank");
        } else if (frame.srcdoc) {
            const blob = new Blob([frame.srcdoc], { type: "text/html;charset=utf-8" });
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, "_blank");
        } else {
            showToast("⚠️ Không có URL xem trước");
        }
    });

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

    // 1. Thu gọn / Mở rộng Cây thư mục (Workspace Explorer)
    const sidebarTree = document.getElementById("ide-file-tree-sidebar");
    const resizerTree = document.getElementById("resizer-tree");
    const btnShowExplorer = document.getElementById("btn-show-explorer");

    document.getElementById("btn-collapse-tree")?.addEventListener("click", () => {
        if (sidebarTree) {
            sidebarTree.classList.add("collapsed");
            if (resizerTree) resizerTree.style.display = "none";
            if (btnShowExplorer) btnShowExplorer.style.display = "inline-flex";
            setTimeout(() => { if (ideCodeMirror) ideCodeMirror.refresh(); }, 150);
            showToast("📁 Đã ẩn Workspace Explorer (Bấm 'Hiện Explorer' trên thanh công cụ để mở lại)");
        }
    });

    btnShowExplorer?.addEventListener("click", () => {
        if (sidebarTree) {
            sidebarTree.classList.remove("collapsed");
            if (resizerTree) resizerTree.style.display = "block";
            btnShowExplorer.style.display = "none";
            setTimeout(() => { if (ideCodeMirror) ideCodeMirror.refresh(); }, 150);
        }
    });

    // 2. Ẩn / Hiện Khung Chat bên phải
    function toggleChatPane() {
        const chatPane = document.getElementById("chat-main-pane");
        const resizerChat = document.getElementById("resizer-chat");
        const btnToggle = document.getElementById("btn-toggle-chat");
        if (chatPane) {
            chatPane.classList.toggle("collapsed");
            const isHidden = chatPane.classList.contains("collapsed");
            if (btnToggle) {
                btnToggle.textContent = isHidden ? "💬 Hiện Chat" : "💬 Ẩn Chat";
                if (isHidden) {
                    btnToggle.classList.add("primary");
                } else {
                    btnToggle.classList.remove("primary");
                }
            }
            if (resizerChat) resizerChat.style.display = isHidden ? "none" : "block";
            setTimeout(() => { if (ideCodeMirror) ideCodeMirror.refresh(); }, 150);
            if (isHidden) {
                showToast("💬 Đã ẩn Khung Chat (Bấm 'Hiện Chat' để mở lại bất kỳ lúc nào)");
            }
        }
    }

    document.getElementById("btn-toggle-chat")?.addEventListener("click", toggleChatPane);
    document.getElementById("btn-close-chat-pane")?.addEventListener("click", toggleChatPane);

    // 3. Kéo giãn thanh Explorer (resizer-tree)
    initSplitterDrag("resizer-tree", (deltaX) => {
        const sidebar = document.getElementById("ide-file-tree-sidebar");
        if (sidebar && !sidebar.classList.contains("collapsed")) {
            const currentW = sidebar.getBoundingClientRect().width;
            const newW = Math.min(600, Math.max(140, currentW + deltaX));
            sidebar.style.width = newW + "px";
            if (ideCodeMirror) ideCodeMirror.refresh();
        }
    });

    // 4. Kéo giãn thanh Terminal (resizer-terminal)
    initSplitterDrag("resizer-terminal", null, (deltaY) => {
        const drawer = document.getElementById("ide-terminal-drawer");
        if (drawer && !drawer.classList.contains("collapsed")) {
            const currentH = drawer.getBoundingClientRect().height;
            const newH = Math.min(550, Math.max(30, currentH - deltaY));
            drawer.style.height = newH + "px";
            if (ideCodeMirror) ideCodeMirror.refresh();
        }
    });

    // 5. Kéo giãn thanh Chat (resizer-chat)
    initSplitterDrag("resizer-chat", (deltaX) => {
        const chatPane = document.getElementById("chat-main-pane");
        if (chatPane && !chatPane.classList.contains("collapsed")) {
            const currentW = chatPane.getBoundingClientRect().width;
            const newW = Math.min(800, Math.max(240, currentW - deltaX));
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
        document.getElementById("sidebar")?.classList.remove("dragging");
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

// ============================================================
// 8. AUTONOMOUS TASK CARDS (STEPS & PROGRESS HELPER)
// ============================================================
window.KiniTaskRunner = {
    cards: {},
    createTaskCard({ id, title, steps, container = null }) {
        const cardId = id || "task-card-" + Date.now();
        const targetContainer = container || document.getElementById("chat-messages") || document.body;
        
        const cardEl = document.createElement("div");
        cardEl.className = "kini-task-card";
        cardEl.id = cardId;
        
        const stepsHtml = (steps || []).map((step, idx) => `
            <div class="task-step-item ${idx === 0 ? 'running' : ''}" id="${cardId}-step-${idx}">
                <div class="task-step-left">
                    <span class="task-step-icon">${idx === 0 ? '⏳' : '⚪'}</span>
                    <span class="task-step-desc">${escapeHtml(typeof step === 'string' ? step : (step.desc || step.title || ''))}</span>
                </div>
                <span class="task-step-badge">${idx === 0 ? 'Đang chạy' : 'Chờ xử lý'}</span>
            </div>
        `).join("");
        
        cardEl.innerHTML = `
            <div class="task-card-header">
                <div class="task-card-title">
                    <span>🤖</span>
                    <span>${escapeHtml(title || 'KINI Autonomous Agent Execution')}</span>
                </div>
                <span class="task-card-badge status-running" id="${cardId}-badge">ĐANG XỬ LÝ</span>
            </div>
            <div class="task-card-progress">
                <div class="task-card-progress-bar" id="${cardId}-prog" style="width: 15%;"></div>
            </div>
            <div class="task-steps-list" id="${cardId}-steps">
                ${stepsHtml}
            </div>
        `;
        
        targetContainer.appendChild(cardEl);
        this.cards[cardId] = { el: cardEl, totalSteps: (steps || []).length, currentStep: 0 };
        return cardId;
    },
    updateStep(cardId, stepIndex, status, details = "") {
        const stepEl = document.getElementById(`${cardId}-step-${stepIndex}`);
        const cardBadge = document.getElementById(`${cardId}-badge`);
        const progBar = document.getElementById(`${cardId}-prog`);
        const cardInfo = this.cards[cardId];
        
        if (stepEl) {
            stepEl.className = `task-step-item ${status}`;
            const iconSpan = stepEl.querySelector(".task-step-icon");
            const badgeSpan = stepEl.querySelector(".task-step-badge");
            if (status === "completed") {
                if (iconSpan) iconSpan.textContent = "✅";
                if (badgeSpan) badgeSpan.textContent = "Hoàn thành";
            } else if (status === "failed") {
                if (iconSpan) iconSpan.textContent = "❌";
                if (badgeSpan) badgeSpan.textContent = "Thất bại";
            } else if (status === "running") {
                if (iconSpan) iconSpan.textContent = "⏳";
                if (badgeSpan) badgeSpan.textContent = "Đang chạy";
            }
        }
        
        if (cardInfo && progBar) {
            const total = cardInfo.totalSteps || 1;
            const percent = Math.min(100, Math.round(((stepIndex + (status === "completed" ? 1 : 0.5)) / total) * 100));
            progBar.style.width = `${percent}%`;
            if (percent >= 100) {
                if (cardBadge) {
                    cardBadge.className = "task-card-badge status-completed";
                    cardBadge.textContent = "HOÀN TẤT";
                }
            } else if (status === "failed") {
                if (cardBadge) {
                    cardBadge.className = "task-card-badge status-failed";
                    cardBadge.textContent = "LỖI";
                }
            }
        }
    }
};
