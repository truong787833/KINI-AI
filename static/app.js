// Quản lý Phiên Người Dùng Độc Lập (Device / Client Isolation)
let kiniClientId = localStorage.getItem("kini_client_id");
const isLocalhostHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

// Nhận diện Nền tảng: Desktop EXE hay Bản Web 24/7
const urlParams = new URLSearchParams(window.location.search);
const isDesktopApp = urlParams.get("platform") === "desktop";

if (!kiniClientId) {
    if (isLocalhostHost) {
        kiniClientId = "master";
    } else {
        kiniClientId = "usr_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    }
    localStorage.setItem("kini_client_id", kiniClientId);
}

// Tự động gắn X-Client-Id và X-Platform vào mọi request fetch
const _originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
    options = options || {};
    options.headers = options.headers || {};
    const platformHeader = isDesktopApp ? "desktop" : "web";
    if (options.headers instanceof Headers) {
        if (!options.headers.has("X-Client-Id")) {
            options.headers.set("X-Client-Id", kiniClientId);
        }
        if (!options.headers.has("X-Platform")) {
            options.headers.set("X-Platform", platformHeader);
        }
    } else {
        options.headers["X-Client-Id"] = kiniClientId;
        options.headers["X-Platform"] = platformHeader;
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
    // Phân tách Giao diện Web 24/7 và Desktop EXE
    if (!isDesktopApp) {
        // Trên bản Web 24/7: Ẩn các tính năng Desktop/Agent hệ điều hành (Studio, Bảng điều khiển phần cứng, Safe/Turbo)
        const btnStudio = document.getElementById("btn-sidebar-studio-btn");
        if (btnStudio) btnStudio.style.display = "none";
        const btnControlCenter = document.getElementById("btn-open-control-center");
        if (btnControlCenter) btnControlCenter.style.display = "none";
        const btnAgentMode = document.getElementById("btn-agent-mode");
        if (btnAgentMode) btnAgentMode.style.display = "none";
        const studioPane = document.getElementById("antigravity-studio-pane");
        if (studioPane) studioPane.style.display = "none";
        const btnTopExitIde = document.getElementById("btn-top-exit-ide");
        if (btnTopExitIde) btnTopExitIde.style.display = "none";
        const splitter = document.getElementById("resizer-chat");
        if (splitter) splitter.style.display = "none";
    }

    try { setupMarkdown(); } catch(e) { console.error("setupMarkdown:", e); }
    try { initOnboardingWelcomeModal(); } catch(e) { console.error("initOnboardingWelcomeModal:", e); }
    try { initNavigationAndModals(); } catch(e) { console.error("initNavigationAndModals:", e); }
    try { initChatCore(); } catch(e) { console.error("initChatCore:", e); }
    try { initSlashCommands(); } catch(e) { console.error("initSlashCommands:", e); }
    try { initClipboardAndDragDrop(); } catch(e) { console.error("initClipboardAndDragDrop:", e); }
    try { initSpeechToText(); } catch(e) { console.error("initSpeechToText:", e); }
    try { initVoiceLive(); } catch(e) { console.error("initVoiceLive:", e); }
    try { initMemories(); } catch(e) { console.error("initMemories:", e); }
    try { updateMemoryCountBadge(); } catch(e) { console.error("updateMemoryCountBadge:", e); }
    try { initSettings(); } catch(e) { console.error("initSettings:", e); }
    try { restoreClientVaultFromBrowserIfNeeded(); } catch(e) { console.error("restoreVault:", e); }
    try { initKeyboardShortcuts(); } catch(e) { console.error("initKeyboardShortcuts:", e); }
    try { initAntigravityIDE(); } catch(e) { console.error("initAntigravityIDE:", e); }
    try { loadConversations(true); } catch(e) { console.error("loadConversations:", e); }
    try { initVersionSystem(); } catch(e) { console.error("initVersionSystem:", e); }
    try { initDeviceIdentity(); } catch(e) { console.error("initDeviceIdentity:", e); }
    try { initArtStudio(); } catch(e) { console.error("initArtStudio:", e); }
    try { initKiniCanvas(); } catch(e) { console.error("initKiniCanvas:", e); }
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

    document.getElementById("btn-open-control-center")?.addEventListener("click", () => {
        closeSidebar();
        openModal("modal-control-center");
        loadControlCenterData();
    });

    // Antigravity IDE Mode vs Chat Mode Switcher
    document.getElementById("btn-mode-chat")?.addEventListener("click", () => switchViewMode("chat"));
    document.getElementById("btn-mode-vibe")?.addEventListener("click", () => {
        if (typeof window.openVibeCodingModal === "function") {
            window.openVibeCodingModal();
        }
    });
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
            if (action === "vibe") {
                if (typeof window.openVibeCodingModal === "function") {
                    window.openVibeCodingModal();
                }
            } else if (action === "game") {
                input.value = "Lập trình một tựa game mini chơi trực tiếp trên web với đồ họa đẹp mắt và âm thanh sống động";
                input.focus();
            } else if (action === "draw") {
                openModal("modal-art-studio");
                if (typeof loadRecentArtStrip === "function") loadRecentArtStrip();
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
        // Chống đóng khi click vào bên trong dropdown
        modelDropdown.addEventListener("click", (e) => {
            e.stopPropagation();
        });

        if (modelBadge) {
            modelBadge.addEventListener("click", (e) => {
                e.stopPropagation();
                const usageCard = document.getElementById("usage-flyout-card");
                if (usageCard) usageCard.style.display = "none";
                modelDropdown.classList.toggle("show");
            });
        }
        if (mobileModelPill) {
            mobileModelPill.addEventListener("click", (e) => {
                e.stopPropagation();
                const usageCard = document.getElementById("usage-flyout-card");
                if (usageCard) usageCard.style.display = "none";
                modelDropdown.classList.toggle("show");
            });
        }

        // Khôi phục model đã chọn từ localStorage
        const savedModel = localStorage.getItem("kini_selected_model");
        if (savedModel) {
            const targetOpt = document.querySelector(`.model-option[data-model="${savedModel}"]`);
            if (targetOpt) {
                document.querySelectorAll(".model-option").forEach(o => o.classList.remove("active"));
                targetOpt.classList.add("active");
                if (modelLabel) {
                    if (savedModel === "flash-3.5") modelLabel.textContent = "Gemini 3.5 Flash";
                    else if (savedModel === "flash-3.8") modelLabel.textContent = "Gemini 3.8 Flash";
                    else if (savedModel === "pro") modelLabel.textContent = "Gemini Pro";
                    else modelLabel.textContent = "Gemini 3.1 Flash Lite";
                }
            }
        }

        document.querySelectorAll(".model-option").forEach(opt => {
            opt.addEventListener("click", (e) => {
                e.stopPropagation();
                document.querySelectorAll(".model-option").forEach(o => o.classList.remove("active"));
                opt.classList.add("active");
                const m = opt.dataset.model;
                localStorage.setItem("kini_selected_model", m);
                
                let selectedName = "Gemini 3.5 Flash";
                if (m === "flash-3.5") selectedName = "Gemini 3.5 Flash";
                else if (m === "flash-3.8") selectedName = "Gemini 3.8 Flash";
                else if (m === "pro") selectedName = "Gemini Pro";
                else selectedName = "Gemini 3.1 Flash Lite";

                if (modelLabel) modelLabel.textContent = selectedName;
                if (mobileModelLabel) {
                    if (m === "flash-3.5") mobileModelLabel.textContent = "KINI 3.5 Flash";
                    else if (m === "flash-3.8") mobileModelLabel.textContent = "KINI 3.8 Flash";
                    else if (m === "pro") mobileModelLabel.textContent = "KINI Pro";
                    else mobileModelLabel.textContent = "KINI Flash Lite";
                }
                
                showToast("⚡ Đã chuyển sang mô hình: " + selectedName);
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

    // Sự kiện thoát Studio IDE quay về chế độ Chat bình thường
    const handleExitStudio = () => {
        switchViewMode("chat");
        showToast("💬 Đã đóng Studio và quay lại giao diện Chat!");
    };
    document.getElementById("btn-top-exit-ide")?.addEventListener("click", handleExitStudio);
    document.getElementById("btn-exit-ide")?.addEventListener("click", handleExitStudio);
    document.getElementById("btn-return-chat-from-header")?.addEventListener("click", handleExitStudio);

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
            // Đóng menu chọn model ngay lập tức để tránh lỗi chèn đè giao diện
            const modelDropdown = document.getElementById("model-dropdown-menu");
            if (modelDropdown) modelDropdown.classList.remove("show");

            if (usageCard.style.display === "none" || !usageCard.style.display) {
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
        if (quickPills) quickPills.style.display = "none";
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

    // 2.1. ĐIỀU PHỐI CHẾ ĐỘ DEEP RESEARCH (NGHIÊN CỨU SÂU ĐA TẦNG)
    if (isDeepResearchMode) {
        try {
            const loadingRow = document.getElementById(loadingId);
            if (loadingRow) {
                const textEl = loadingRow.querySelector(".loading-text");
                if (textEl) textEl.textContent = "🔬 Đang kích hoạt Deep Research: Rà soát đa nguồn Google News, Báo chí, Wikipedia & Thư viện pháp luật...";
            }
            const res = await fetch("/api/research/deep", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic: message, conv_id: currentConvId })
            });
            const data = await res.json();
            removeLoadingMessage(loadingId);
            if (data.reply) {
                appendAssistantMessage(data.reply, "", false, "Gemini Pro (Deep Research)");
                isDeepResearchMode = false;
                document.getElementById("btn-deep-research")?.classList.remove("active");
                userInput.placeholder = "Hỏi KINI bất kỳ điều gì...";
                loadConversations(false);
                return;
            }
        } catch(researchErr) {
            console.warn("Lỗi Deep Research, fallback về chat thường:", researchErr);
            isDeepResearchMode = false;
            document.getElementById("btn-deep-research")?.classList.remove("active");
            userInput.placeholder = "Hỏi KINI bất kỳ điều gì...";
        }
    }

    try {
        const formData = new FormData();
        formData.append("conv_id", currentConvId);
        formData.append("message", message);
        formData.append("model_mode", document.querySelector(".model-option.active")?.dataset.model || "flash");
        formData.append("agent_mode", currentAgentMode);
        formData.append("platform", isDesktopApp ? "desktop" : "web");
        
        if (filesToSend.length === 1) {
            formData.append("file", filesToSend[0]);
        } else if (filesToSend.length > 1) {
            for (const f of filesToSend) {
                formData.append("files", f);
            }
        }

        let streamingSucceeded = false;
        try {
            const streamRes = await fetch("/api/chat/stream", {
                method: "POST",
                body: formData
            });

            if (streamRes.ok && streamRes.body) {
                removeLoadingMessage(loadingId);
                const streamRow = createStreamingAssistantRow();
                const reader = streamRes.body.getReader();
                const decoder = new TextDecoder("utf-8");
                let accumulatedReply = "";
                let finalData = null;
                let buffer = "";

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop();

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed.startsWith("data: ")) {
                            try {
                                const evt = JSON.parse(trimmed.slice(6));
                                if (evt.type === "chunk" && evt.text) {
                                    accumulatedReply += evt.text;
                                    streamRow.updateStreamText(accumulatedReply);
                                } else if (evt.type === "done") {
                                    finalData = evt;
                                    if (evt.reply) accumulatedReply = evt.reply;
                                }
                            } catch (e) {}
                        }
                    }
                }

                if (accumulatedReply || finalData) {
                    streamingSucceeded = true;
                    streamRow.finalizeMessage(accumulatedReply, finalData);
                } else {
                    streamRow.msgRow.remove();
                }
            }
        } catch (streamErr) {
            console.warn("Lỗi luồng streaming, tự động chuyển về fallback tiêu chuẩn:", streamErr);
        }

        // Fallback tiêu chuẩn nếu trình duyệt hoặc mạng không hỗ trợ streaming
        if (!streamingSucceeded) {
            const res = await fetch("/api/chat", {
                method: "POST",
                body: formData
            });

            const data = await res.json();
            removeLoadingMessage(loadingId);

            if (data.reply) {
                appendAssistantMessage(data.reply, data.image_url, data.is_image_generated, data.model_used, data);
                if (data.is_agent && typeof refreshFileTree === "function") {
                    refreshFileTree();
                }
                updateMemoryCountBadge();
                loadConversations(false);
                refreshUsageStats();
            } else {
                appendAssistantMessage("⚠️ Không nhận được phản hồi từ KINI AI. Vui lòng thử lại.");
            }
        }

    } catch (err) {
        removeLoadingMessage(loadingId);
        appendAssistantMessage("❌ Lỗi kết nối tới máy chủ KINI AI: " + err.message);
    }
}

function createStreamingAssistantRow() {
    const container = document.getElementById("chat-messages");
    const row = document.createElement("div");
    row.className = "message-row assistant";
    row.innerHTML = `
        <div class="message-avatar"><img src="/static/kini_logo.png" alt="KINI" class="msg-avatar-img"></div>
        <div class="message-body">
            <div class="message-bubble">
                <span class="streaming-text"></span><span class="streaming-cursor">▍</span>
            </div>
            <div class="msg-actions" style="display: none;"></div>
        </div>
    `;
    container.appendChild(row);
    scrollToBottom();

    const textSpan = row.querySelector(".streaming-text");
    const cursor = row.querySelector(".streaming-cursor");

    return {
        msgRow: row,
        updateStreamText: (rawText) => {
            textSpan.innerHTML = formatMarkdown(rawText);
            scrollToBottom();
        },
        finalizeMessage: (finalContent, extraData) => {
            if (cursor) cursor.remove();
            row.remove();
            appendAssistantMessage(
                finalContent, 
                extraData?.image_url || "", 
                extraData?.is_image_generated || false, 
                extraData?.model_used || "gemini-3.1-flash-lite", 
                extraData
            );
            if (extraData?.is_agent && typeof refreshFileTree === "function") {
                refreshFileTree();
            }
            updateMemoryCountBadge();
            loadConversations(false);
            refreshUsageStats();
        }
    };
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
    initRenderedCharts(row);
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
        <div class="message-avatar"><img src="/static/kini_logo.png" alt="KINI" class="msg-avatar-img"></div>
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

function appendAssistantMessage(content, imageUrl = "", isImageGen = false, modelUsed = "", extraData = null) {
    const container = document.getElementById("chat-messages");
    const row = document.createElement("div");
    row.className = "message-row assistant";

    let imgBlock = "";
    if (imageUrl) {
        imgBlock = `
            <div class="msg-image-card">
                <div class="msg-image-wrapper">
                    <img src="${imageUrl}" class="msg-inline-image" alt="Artwork" onclick="openLightbox('${imageUrl}', '${escapeAttr(content)}')" onload="this.parentElement.style.minHeight='auto'; if(typeof scrollToBottom==='function') scrollToBottom();" onerror="if(!this.dataset.retried){this.dataset.retried='1'; this.src='${imageUrl}?t='+Date.now();}">
                    <div class="msg-image-overlay-badge">
                        <span>✨ KINI AI Art Studio</span>
                    </div>
                </div>
                <div class="msg-image-actions">
                    <a href="${imageUrl}" download="kini_artwork.jpg" class="btn-img-action btn-img-download" title="Tải ảnh gốc HD">
                        <span>⬇️</span> Tải Ảnh HD
                    </a>
                    <button class="btn-img-action" onclick="openLightbox('${imageUrl}', '${escapeAttr(content)}')" title="Xem toàn màn hình">
                        <span>🔍</span> Phóng To
                    </button>
                    <button class="btn-img-action btn-img-remix" onclick="remixPrompt('${escapeAttr(content)}')" title="Tạo biến thể khác từ tác phẩm này">
                        <span>🔄</span> Tạo Biến Thể
                    </button>
                    <button class="btn-img-action" onclick="copyImageUrl('${imageUrl}', this)" title="Sao chép liên kết ảnh">
                        <span>📋</span> Chép Link
                    </button>
                </div>
            </div>
        `;
    }

    const renderedHtml = formatMarkdown(content);
    const displayModel = (content && content.includes("Chưa cấu hình Google Gemini API Key")) ? "None" : (modelUsed || "KINI AI");

    // Thẻ Đề Xuất Kế Hoạch Antigravity (Nếu là Agent Proposal)
    let proposalCardHtml = "";
    if (extraData && extraData.is_agent_proposal) {
        const taskPrompt = extraData.task_prompt || "";
        const actions = extraData.proposed_actions || [];
        let itemsHtml = "";
        if (actions.length > 0) {
            for (const act of actions) {
                const actType = act.type || "file";
                const icon = actType === "folder" ? "📁" : (actType === "command" ? "⚡" : "📄");
                const label = actType === "folder" ? "Tạo thư mục" : (actType === "command" ? "Chạy lệnh" : "Tạo tệp");
                itemsHtml += `
                    <div class="proposal-action-item">
                        <span class="proposal-action-icon">${icon}</span>
                        <span class="proposal-action-text"><b>${label}:</b> ${escapeHtml(act.path || act.command || "")}</span>
                    </div>
                `;
            }
        } else {
            itemsHtml = `
                <div class="proposal-action-item">
                    <span class="proposal-action-icon">📁</span>
                    <span class="proposal-action-text">KINI Agent sẽ tự động tạo thư mục và các tệp mã nguồn cần thiết cho: <i>"${escapeHtml(taskPrompt)}"</i></span>
                </div>
            `;
        }

        proposalCardHtml = `
            <div class="antigravity-proposal-card">
                <div class="proposal-card-header">
                    <div class="proposal-header-left">
                        <span class="proposal-shield-icon">🛡️</span>
                        <div>
                            <div class="proposal-title">KẾ HOẠCH HÀNH ĐỘNG AGENT (ĐANG CHỜ BẠN DUYỆT)</div>
                            <div class="proposal-subtitle">KINI Agent đã sẵn sàng tác động vào máy tính, hãy phê duyệt để bắt đầu:</div>
                        </div>
                    </div>
                    <span class="proposal-mode-badge">Safe Mode</span>
                </div>
                <div class="proposal-actions-list">
                    ${itemsHtml}
                </div>
                <div class="proposal-card-buttons">
                    <button class="btn-proposal-btn btn-primary-confirm" onclick="confirmAndRunAgent('${escapeAttr(taskPrompt)}')">
                        <span>▶️</span> Chấp nhận (Chạy ngay)
                    </button>
                    <button class="btn-proposal-btn btn-turbo-confirm" onclick="confirmWithTurbo('${escapeAttr(taskPrompt)}')">
                        <span>⚡</span> Duyệt & Bật Turbo
                    </button>
                    <button class="btn-proposal-btn btn-edit-confirm" onclick="editAgentProposal('${escapeAttr(taskPrompt)}')">
                        <span>✏️</span> Chỉnh sửa yêu cầu
                    </button>
                </div>
            </div>
        `;
    }

    // Nhận diện nếu có sản phẩm do KINI Agent tạo ra trong workspace hoặc thông báo thiếu API Key
    let agentActionsHtml = "";
    if (content && content.includes("Chưa cấu hình Google Gemini API Key")) {
        agentActionsHtml += `
            <button class="btn-msg-action" onclick="openModal('modal-settings'); if(typeof loadSettings==='function') loadSettings();" style="border-color: rgba(56, 189, 248, 0.5); color: #38bdf8; background: rgba(56, 189, 248, 0.12); font-weight: 600;" title="Mở nhanh bảng dán API Key miễn phí">
                <span class="action-icon">🔑</span> Nhập API Key Ngay
            </button>
        `;
    }
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

    let formattedModelName = displayModel;
    if (displayModel === "gemini-3.8-flash") formattedModelName = "Gemini 3.8 Flash";
    else if (displayModel === "gemini-3.5-flash") formattedModelName = "Gemini 3.5 Flash";
    else if (displayModel === "gemini-3.1-flash-lite") formattedModelName = "Gemini 3.1 Flash Lite";
    else if (displayModel === "gemini-flash-lite-latest") formattedModelName = "Gemini Flash Lite";
    else if (displayModel === "gemini-2.5-pro" || displayModel === "gemini-3.1-pro-preview") formattedModelName = "Gemini Pro";
    else if (displayModel === "None") formattedModelName = "Hệ thống";

    let fallbackHint = "";
    if (extraData && (extraData.is_fallback || extraData.fallback_from_38 || extraData.fallback_reason)) {
        const reasonText = extraData.fallback_reason || "Google Gemini 3.8 Flash / Pro tạm thời quá tải (503), KINI đã tự động chuyển sang Flash Lite để phản hồi ngay lập tức.";
        fallbackHint = ` <span style="opacity:0.9;font-size:11px;color:#f59e0b;background:rgba(245,158,11,0.15);padding:1px 6px;border-radius:4px;border:1px solid rgba(245,158,11,0.3);margin-left:4px;" title="${escapeAttr(reasonText)}">⚠️ (Dự phòng do Google 503)</span>`;
    }

    row.innerHTML = `
        <div class="message-avatar"><img src="/static/kini_logo.png" alt="KINI" class="msg-avatar-img"></div>
        <div class="message-body">
            <div class="message-bubble">
                ${renderedHtml}
                ${imgBlock}
                ${proposalCardHtml}
            </div>
            <div class="msg-actions">
                <span class="msg-model-badge" title="Mô hình xử lý thực tế từ Google AI API">⚡ ${escapeHtml(formattedModelName)}${fallbackHint}</span>
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
    initRenderedCharts(row);
    scrollToBottom();
}

function scrollToBottom() {
    const viewport = document.getElementById("chat-viewport");
    if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
    }
}

// ============================================================
// 2.1. HỆ THỐNG AGENT CONFIRMATION & TURBO MODE (CHUẨN ANTIGRAVITY)
// ============================================================
let currentAgentMode = localStorage.getItem("kini_agent_mode") || "safe";

function updateAgentModeUI(mode) {
    currentAgentMode = mode;
    localStorage.setItem("kini_agent_mode", mode);
    const icon = document.getElementById("agent-mode-icon");
    const label = document.getElementById("agent-mode-label");
    const btn = document.getElementById("btn-agent-mode");
    const sel = document.getElementById("setting-agent-mode");

    if (mode === "turbo") {
        if (icon) icon.textContent = "⚡";
        if (label) label.textContent = "Turbo";
        if (btn) {
            btn.classList.add("turbo-active");
            btn.title = "Chế độ: ⚡ Tự hành Turbo (Bấm để chuyển sang Hỏi trước)";
        }
        if (sel) sel.value = "turbo";
    } else {
        if (icon) icon.textContent = "🛡️";
        if (label) label.textContent = "Safe";
        if (btn) {
            btn.classList.remove("turbo-active");
            btn.title = "Chế độ: 🛡️ Hỏi trước Safe Mode (Bấm để chuyển sang Tự hành Turbo)";
        }
        if (sel) sel.value = "safe";
    }
}

async function setAgentMode(mode) {
    updateAgentModeUI(mode);
    try {
        await fetch("/api/system/agent-mode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agent_mode: mode })
        });
    } catch (e) {
        console.warn("Lỗi đồng bộ agent mode:", e);
    }
}

async function toggleAgentMode() {
    const nextMode = currentAgentMode === "safe" ? "turbo" : "safe";
    await setAgentMode(nextMode);
    showToast(nextMode === "turbo" ? "⚡ Đã bật Chế độ Tự hành Turbo (Chạy ngay không cần hỏi lại)" : "🛡️ Đã bật Chế độ An toàn (Hỏi trước & đề xuất kế hoạch)");
}

function initAgentModeSystem() {
    document.getElementById("btn-agent-mode")?.addEventListener("click", toggleAgentMode);
    document.getElementById("setting-agent-mode")?.addEventListener("change", (e) => {
        setAgentMode(e.target.value);
    });
    updateAgentModeUI(currentAgentMode);
}

async function confirmAndRunAgent(taskPrompt) {
    if (!taskPrompt) return;
    const loadingId = appendLoadingMessage();
    try {
        const formData = new FormData();
        formData.append("conv_id", currentConvId);
        formData.append("message", "Chấp nhận thực thi: " + taskPrompt);
        formData.append("confirm_agent", "yes");
        formData.append("task_prompt", taskPrompt);
        formData.append("model_mode", document.querySelector(".model-option.active")?.dataset.model || "flash");
        formData.append("agent_mode", currentAgentMode);
        formData.append("platform", isDesktopApp ? "desktop" : "web");

        const res = await fetch("/api/chat", {
            method: "POST",
            body: formData
        });
        const data = await res.json();
        removeLoadingMessage(loadingId);
        if (data.reply) {
            appendAssistantMessage(data.reply, data.image_url, data.is_image_generated, data.model_used, data);
            if (typeof refreshFileTree === "function") refreshFileTree();
            showToast("✅ KINI Agent đã hoàn thành tác vụ!");
        } else {
            appendAssistantMessage("⚠️ Không thể hoàn thành tác vụ: " + (data.error || "Không có phản hồi."));
        }
    } catch (err) {
        removeLoadingMessage(loadingId);
        appendAssistantMessage("❌ Lỗi thực thi tác vụ: " + err.message);
    }
}

async function confirmWithTurbo(taskPrompt) {
    await setAgentMode("turbo");
    await confirmAndRunAgent(taskPrompt);
}

function editAgentProposal(taskPrompt) {
    const textarea = document.getElementById("main-user-input");
    if (textarea) {
        textarea.value = taskPrompt;
        textarea.focus();
        showToast("Đã đưa yêu cầu vào ô nhập, bạn có thể chỉnh sửa rồi nhấn Gửi.");
    }
}

// ============================================================
// 3. GIỌNG ĐỌC AI & THU ÂM TIẾNG VIỆT (DUAL-ENGINE TURBO TTS)
// ============================================================
function speakWithBrowserSpeech(text, onEndCallback) {
    if (!('speechSynthesis' in window)) {
        if (onEndCallback) onEndCallback();
        return;
    }
    try {
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/[*_#`~[\]]/g, '').replace(/https?:\/\/\S+/g, '').substring(0, 300).trim();
        if (!cleanText) {
            if (onEndCallback) onEndCallback();
            return;
        }
        const utter = new SpeechSynthesisUtterance(cleanText);
        utter.lang = 'vi-VN';
        utter.rate = 1.15;

        const voices = window.speechSynthesis.getVoices();
        const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VI'));
        if (viVoice) utter.voice = viVoice;

        let finished = false;
        const finish = () => {
            if (!finished) {
                finished = true;
                if (onEndCallback) onEndCallback();
            }
        };

        utter.onend = finish;
        utter.onerror = finish;
        setTimeout(finish, 12000); // Ngắt an toàn

        window.speechSynthesis.speak(utter);
    } catch(e) {
        console.warn("Lỗi Web Speech API:", e);
        if (onEndCallback) onEndCallback();
    }
}

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
        const ttsController = new AbortController();
        const ttsTimer = setTimeout(() => ttsController.abort(), 3200);

        const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text, voice: voiceType }),
            signal: ttsController.signal
        });
        clearTimeout(ttsTimer);
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
                speakWithBrowserSpeech(text, () => {
                    btnElement.classList.remove("speaking");
                    btnElement.innerHTML = `<span class="action-icon">🔊</span> Nghe đọc`;
                });
            };
            audio.play().catch(() => {
                speakWithBrowserSpeech(text, () => {
                    btnElement.classList.remove("speaking");
                    btnElement.innerHTML = `<span class="action-icon">🔊</span> Nghe đọc`;
                });
            });
        } else {
            speakWithBrowserSpeech(text, () => {
                btnElement.classList.remove("speaking");
                btnElement.innerHTML = `<span class="action-icon">🔊</span> Nghe đọc`;
            });
        }
    } catch (e) {
        speakWithBrowserSpeech(text, () => {
            btnElement.classList.remove("speaking");
            btnElement.innerHTML = `<span class="action-icon">🔊</span> Nghe đọc`;
        });
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
    if (typeof loadRagDocuments === "function") loadRagDocuments();
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
        if (typeof scheduleVaultSync === "function") scheduleVaultSync();
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
        if (!(await kiniConfirm("Xóa toàn bộ ký ức", "Anh có chắc chắn muốn xóa toàn bộ ký ức dài hạn của KINI không?"))) return;
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
    if (!(await kiniConfirm("Xóa ký ức", "Anh có chắc muốn xóa ký ức này không?"))) return;
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
        const poolEl = document.getElementById("setting-gemini-keys-pool");
        if (poolEl && data.gemini_api_keys_pool !== undefined) {
            poolEl.value = data.gemini_api_keys_pool || "";
        }
        const olEnEl = document.getElementById("setting-ollama-enabled");
        if (olEnEl) olEnEl.checked = (data.ollama_enabled === "1");
        const olModEl = document.getElementById("setting-ollama-model");
        if (olModEl && data.ollama_model) olModEl.value = data.ollama_model;
        if (data.custom_persona) {
            document.getElementById("setting-persona").value = data.custom_persona;
        }
        if (data.agent_mode) {
            updateAgentModeUI(data.agent_mode);
        } else {
            updateAgentModeUI(currentAgentMode);
        }

        const userPill = document.querySelector("#btn-user-profile .user-name");
        if (userPill) {
            userPill.textContent = data.is_master ? "Hải Trường" : "Người dùng";
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
    initAgentModeSystem();
    document.getElementById("btn-save-settings")?.addEventListener("click", async () => {
        const key = document.getElementById("setting-gemini-key").value.trim();
        const keysPool = document.getElementById("setting-gemini-keys-pool")?.value.trim() || "";
        const ollamaEnabled = document.getElementById("setting-ollama-enabled")?.checked ? "1" : "0";
        const ollamaModel = document.getElementById("setting-ollama-model")?.value.trim() || "kini-ai";
        const persona = document.getElementById("setting-persona").value.trim();
        const agentModeVal = document.getElementById("setting-agent-mode")?.value || currentAgentMode;
        try {
            await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    gemini_api_key: key, 
                    gemini_api_keys_pool: keysPool,
                    ollama_enabled: ollamaEnabled,
                    ollama_model: ollamaModel,
                    custom_persona: persona,
                    agent_mode: agentModeVal
                })
            });
            updateAgentModeUI(agentModeVal);
            if (typeof syncClientVaultToBrowser === "function") syncClientVaultToBrowser();
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
let currentSystemVersion = "4.3.0";
let latestSystemVersion = "4.3.0";

async function initVersionSystem() {
    const btnRestartUpdate = document.getElementById("btn-restart-update");
    const settingsVerEl = document.getElementById("settings-current-ver");
    const settingsBuildEl = document.getElementById("settings-build-num");

    try {
        const res = await fetch("/api/system/version");
        const data = await res.json();
        currentSystemVersion = data.version || "4.3.0";
        latestSystemVersion = data.latest_version || currentSystemVersion;

        if (settingsVerEl) settingsVerEl.textContent = "v" + currentSystemVersion;
        if (settingsBuildEl && data.build_number) settingsBuildEl.textContent = `(Build ${data.build_number})`;

        // Nếu có bản cập nhật mới -> Hiện nút 'Restart to Update →' chuẩn Antigravity
        if (data.has_update && data.version !== data.latest_version) {
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

    // Sự kiện nạp file OTA trực tiếp từ máy tính (.zip)
    const otaFileInput = document.getElementById("input-ota-file");
    if (otaFileInput && !otaFileInput.dataset.bound) {
        otaFileInput.dataset.bound = "true";
        otaFileInput.addEventListener("change", async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            if (!file.name.endsWith(".zip")) {
                showToast("❌ Vui lòng chọn tệp gói cập nhật định dạng .zip");
                return;
            }

            const formData = new FormData();
            formData.append("file", file);

            showToast(`📦 Đang nạp gói OTA ${file.name}...`);
            try {
                const res = await fetch("/api/system/upload-ota", {
                    method: "POST",
                    body: formData
                });
                const data = await res.json();
                if (data.success) {
                    showToast(`🎉 Cập nhật OTA thành công lên v${data.new_version || "mới"}! Đang tải lại...`);
                    setTimeout(() => window.location.reload(), 800);
                } else {
                    showToast(`❌ Cập nhật OTA thất bại: ${data.message || data.detail}`);
                }
            } catch(err) {
                showToast("❌ Lỗi nạp OTA: " + err.message);
            } finally {
                otaFileInput.value = "";
            }
        });
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
        progStatus.textContent = "📦 Đang nạp gói cập nhật OTA siêu tốc...";
        await new Promise(r => setTimeout(r, 400));

        progFill.style.width = "70%";
        progStatus.textContent = "⚡ Đang đồng bộ các tệp thay đổi và dọn dẹp bộ nhớ...";
        await new Promise(r => setTimeout(r, 500));

        try {
            const res = await fetch("/api/system/apply-update", { method: "POST" });
            const data = await res.json();
            progFill.style.width = "100%";
            progStatus.textContent = "🎉 Cập nhật hoàn tất! Khởi động lại...";
            await new Promise(r => setTimeout(r, 600));

            showToast("🚀 KINI AI đã được nâng cấp lên phiên bản " + (data.new_version || latestSystemVersion) + "!");
            closeModal("modal-update");
            if (btnRestartUpdate) btnRestartUpdate.style.display = "none";
            setTimeout(() => {
                window.location.reload();
            }, 500);
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
            if (data.has_update && data.current_version !== data.latest_version) {
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
    const safeCat = (c.category && c.category !== "haitruong") ? c.category : "Chung";
    const categoryTag = `📁 ${escapeHtml(safeCat)}`;

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
        projHeader.innerHTML = `
            <span>Dự Án & Phân Mục</span>
            <button class="btn-sidebar-add-folder" id="btn-add-project-folder" title="Tạo Thư mục Dự án mới">
                <span>📁＋</span> Mục mới
            </button>
        `;
        list.appendChild(projHeader);

        // Sự kiện bấm nút "📁＋ Mục mới"
        projHeader.querySelector("#btn-add-project-folder")?.addEventListener("click", async (e) => {
            e.stopPropagation();
            const newCat = prompt("Nhập tên mục / dự án mới (ví dụ: Bán Hàng, Luật Pháp, Lập Trình...):");
            if (!newCat || !newCat.trim()) return;
            const catName = newCat.trim();
            try {
                const res = await fetch("/api/conversations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: `Đoạn chat mới (${catName})`, category: catName })
                });
                const data = await res.json();
                showToast(`📁 Đã tạo mục mới: "${catName}"!`);
                await loadConversations(false);
                await switchConversation(data.id);
            } catch (err) {
                showToast("❌ Lỗi tạo mục mới: " + err.message);
            }
        });

        // Gom nhóm theo category (Thư mục dự án)
        const categories = {};
        unpinned.forEach(c => {
            const cat = (c.category && c.category !== "haitruong") ? c.category : "Chung";
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(c);
        });

        for (const [catName, convArray] of Object.entries(categories)) {
            const folderTitle = document.createElement("div");
            folderTitle.className = "project-folder-title";
            folderTitle.innerHTML = `
                <div class="folder-title-left">
                    <span class="folder-icon">📁</span>
                    <span class="folder-name">${escapeHtml(catName)}</span>
                    <span class="folder-count">(${convArray.length})</span>
                </div>
                <button class="btn-folder-add-chat" data-cat="${escapeHtml(catName)}" title="Tạo đoạn chat mới trong mục ${escapeHtml(catName)}">＋</button>
            `;
            
            folderTitle.querySelector(".btn-folder-add-chat")?.addEventListener("click", async (e) => {
                e.stopPropagation();
                try {
                    const res = await fetch("/api/conversations", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ title: `Đoạn chat mới (${catName})`, category: catName })
                    });
                    const data = await res.json();
                    await loadConversations(false);
                    await switchConversation(data.id);
                    showToast(`✨ Tạo đoạn chat mới trong "${catName}"!`);
                } catch (err) {
                    console.error(err);
                }
            });

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
    const isMaster = kiniClientId === "master";
    const msg = isMaster 
        ? "Anh Trường có chắc chắn muốn xóa vĩnh viễn đoạn hội thoại này không?\nDữ liệu sẽ được xóa sạch khỏi bộ nhớ." 
        : "Bạn có chắc chắn muốn xóa vĩnh viễn cuộc trò chuyện này không?";
    if (!(await kiniConfirm("Xóa cuộc trò chuyện", msg))) return;
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

window.downloadArtifactHtml = function(artifactId) {
    if (!window.__KINI_ARTIFACTS || !window.__KINI_ARTIFACTS[artifactId]) return;
    const item = window.__KINI_ARTIFACTS[artifactId];
    let content = item.code;
    let filename = (item.lang === "js" ? "vibe_script.js" : "vibe_app.html");
    const blob = new Blob([content], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (typeof showToast === "function") showToast("⬇️ Đã tải mã nguồn Vibe App về máy!");
};

// ============================================================
// HỆ THỐNG KINI INTERACTIVE CANVAS & VIBE RUNNER (CHUẨN CLAUDE ARTIFACTS)
// Vừa chat vừa xem Live App bên phải - không chia tab phức tạp
// ============================================================
window.__ACTIVE_CANVAS_CODE = "";
window.__ACTIVE_CANVAS_TITLE = "Live Web App / Game";
window.__ACTIVE_CANVAS_LANG = "html";

window.setQuickPrompt = function(text) {
    const input = document.getElementById("main-user-input");
    if (!input) return;
    input.value = text;
    input.focus();
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 180) + "px";
};

window.openKiniCanvas = function(code, title = "✨ Interactive Canvas", lang = "html") {
    const canvasPanel = document.getElementById("kini-canvas-panel");
    const canvasFrame = document.getElementById("kini-canvas-frame");
    const canvasTitle = document.getElementById("kini-canvas-title");
    
    if (!canvasPanel || !canvasFrame) return;

    window.__ACTIVE_CANVAS_CODE = code;
    window.__ACTIVE_CANVAS_TITLE = title;
    window.__ACTIVE_CANVAS_LANG = lang;

    if (canvasTitle) canvasTitle.textContent = title;

    const isJs = (lang && (lang.toLowerCase() === "js" || lang.toLowerCase() === "javascript")) || 
                 (!code.includes("<html") && !code.includes("<!DOCTYPE") && 
                  (code.includes("canvas") || code.includes("function") || code.includes("const ") || code.includes("let ")));

    if (isJs) {
        canvasFrame.removeAttribute("src");
        canvasFrame.setAttribute("sandbox", "allow-scripts allow-forms");
        canvasFrame.srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:12px;background:#0d1117;color:#f8fafc;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:95vh;}canvas{background:#000;border:1px solid #334155;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.5);display:block;max-width:100%;}</style></head><body><canvas id="canvas" width="600" height="400"></canvas><script>${code}<\/script></body></html>`;
    } else {
        canvasFrame.removeAttribute("src");
        canvasFrame.setAttribute("sandbox", "allow-scripts allow-forms");
        canvasFrame.srcdoc = code;
    }

    canvasPanel.style.display = "flex";
    showToast("✨ Đã mở Live Canvas bên cạnh!");
};

window.closeKiniCanvas = function() {
    const canvasPanel = document.getElementById("kini-canvas-panel");
    const canvasFrame = document.getElementById("kini-canvas-frame");
    if (canvasFrame) {
        canvasFrame.srcdoc = "";
        canvasFrame.removeAttribute("src");
    }
    if (canvasPanel) {
        canvasPanel.style.display = "none";
        canvasPanel.classList.remove("fullscreen");
    }
};

window.launchArtifactRunner = function(artifactIdOrBtn) {
    let code = "";
    let lang = "html";
    let title = "✨ Live Web App / Game Runner";

    if (typeof artifactIdOrBtn === "string" && window.__KINI_ARTIFACTS && window.__KINI_ARTIFACTS[artifactIdOrBtn]) {
        code = window.__KINI_ARTIFACTS[artifactIdOrBtn].code;
        lang = window.__KINI_ARTIFACTS[artifactIdOrBtn].lang || "html";
        title = window.__KINI_ARTIFACTS[artifactIdOrBtn].title || title;
    } else if (artifactIdOrBtn && artifactIdOrBtn.nodeType) {
        const wrapper = artifactIdOrBtn.closest(".code-block-wrapper");
        code = wrapper ? wrapper.querySelector("code")?.textContent || "" : "";
        const label = wrapper ? wrapper.querySelector(".code-lang-label")?.textContent : "";
        lang = label || "html";
    }

    if (!code) return;

    // Mở trực tiếp trên Bảng Canvas Song Song hiện đại (Chuẩn Claude Artifacts)
    openKiniCanvas(code, title, lang);
};

function initKiniCanvas() {
    const canvasPanel = document.getElementById("kini-canvas-panel");
    const canvasFrame = document.getElementById("kini-canvas-frame");
    const btnClose = document.getElementById("btn-canvas-close");
    const btnReload = document.getElementById("btn-canvas-reload");
    const btnDownload = document.getElementById("btn-canvas-download");
    const btnFullscreen = document.getElementById("btn-canvas-fullscreen");
    const btnViewport = document.getElementById("btn-canvas-viewport");
    const frameContainer = document.getElementById("canvas-frame-container");

    btnClose?.addEventListener("click", () => {
        closeKiniCanvas();
    });

    btnReload?.addEventListener("click", () => {
        if (!canvasFrame || !window.__ACTIVE_CANVAS_CODE) return;
        const code = window.__ACTIVE_CANVAS_CODE;
        const lang = window.__ACTIVE_CANVAS_LANG || "html";
        const isJs = (lang && (lang.toLowerCase() === "js" || lang.toLowerCase() === "javascript")) || 
                     (!code.includes("<html") && !code.includes("<!DOCTYPE") && 
                      (code.includes("canvas") || code.includes("function") || code.includes("const ") || code.includes("let ")));

        if (isJs) {
            canvasFrame.srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:12px;background:#0d1117;color:#f8fafc;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:95vh;}canvas{background:#000;border:1px solid #334155;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.5);display:block;max-width:100%;}</style></head><body><canvas id="canvas" width="600" height="400"></canvas><script>${code}<\/script></body></html>`;
        } else {
            canvasFrame.srcdoc = code;
        }
        showToast("🔄 Đã làm mới ứng dụng!");
    });

    btnDownload?.addEventListener("click", () => {
        if (!window.__ACTIVE_CANVAS_CODE) return;
        const blob = new Blob([window.__ACTIVE_CANVAS_CODE], { type: "text/html;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        const titleSlug = (window.__ACTIVE_CANVAS_TITLE || "kini_app").toLowerCase().replace(/[^a-z0-9]/g, "_");
        a.download = `${titleSlug}.html`;
        a.click();
        URL.revokeObjectURL(a.href);
        showToast("⬇️ Đã tải file HTML về máy!");
    });

    btnFullscreen?.addEventListener("click", () => {
        if (!canvasPanel) return;
        canvasPanel.classList.toggle("fullscreen");
        btnFullscreen.textContent = canvasPanel.classList.contains("fullscreen") ? "⤢ Thu nhỏ" : "⛶";
    });

    btnViewport?.addEventListener("click", () => {
        if (!frameContainer) return;
        frameContainer.classList.toggle("mobile-view");
        const isMobile = frameContainer.classList.contains("mobile-view");
        btnViewport.textContent = isMobile ? "💻 Desktop" : "📱 Mobile";
        showToast(isMobile ? "📱 Chuyển sang kích thước điện thoại" : "💻 Chuyển sang kích thước máy tính");
    });
}

// ============================================================
// HỆ THỐNG BIỂU ĐỒ DỮ LIỆU TƯƠNG TÁC (CHART.JS INTERACTIVE ENGINE)
// ============================================================
window.__KINI_CHARTS = window.__KINI_CHARTS || {};
window.__KINI_CHART_INSTANCES = window.__KINI_CHART_INSTANCES || {};

function initRenderedCharts(container) {
    if (typeof Chart === "undefined" || !container) return;
    const canvases = container.querySelectorAll("canvas[id^='chart_']");
    canvases.forEach(canvas => {
        const chartId = canvas.id;
        if (window.__KINI_CHART_INSTANCES[chartId]) return;
        const chartData = window.__KINI_CHARTS[chartId];
        if (!chartData) return;

        try {
            const ctx = canvas.getContext("2d");
            const type = (chartData.type || "bar").toLowerCase();
            const colors = [
                "rgba(56, 189, 248, 0.85)",   // Cyan
                "rgba(168, 85, 247, 0.85)",   // Purple
                "rgba(244, 63, 94, 0.85)",    // Rose
                "rgba(16, 185, 129, 0.85)",   // Emerald
                "rgba(245, 158, 11, 0.85)",   // Amber
                "rgba(59, 130, 246, 0.85)"    // Blue
            ];
            const borderColors = [
                "#38bdf8", "#a855f7", "#f43f5e", "#10b981", "#f59e0b", "#3b82f6"
            ];

            if (chartData.data && chartData.data.datasets) {
                chartData.data.datasets.forEach((ds, idx) => {
                    if (!ds.backgroundColor) {
                        if (['pie', 'doughnut', 'polararea'].includes(type)) {
                            ds.backgroundColor = colors;
                            ds.borderColor = borderColors;
                        } else {
                            ds.backgroundColor = colors[idx % colors.length];
                            ds.borderColor = borderColors[idx % borderColors.length];
                            ds.borderWidth = ds.borderWidth || 2;
                        }
                    }
                    if (type === 'line') {
                        ds.tension = ds.tension !== undefined ? ds.tension : 0.35;
                        ds.fill = ds.fill !== undefined ? ds.fill : true;
                    }
                });
            }

            const chartInstance = new Chart(ctx, {
                type: type,
                data: chartData.data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: "#cbd5e1", font: { family: "system-ui", size: 12 } }
                        },
                        tooltip: {
                            backgroundColor: "rgba(15, 23, 42, 0.95)",
                            titleColor: "#38bdf8",
                            bodyColor: "#f1f5f9",
                            borderColor: "rgba(56, 189, 248, 0.3)",
                            borderWidth: 1,
                            padding: 10,
                            cornerRadius: 8
                        }
                    },
                    scales: ['pie', 'doughnut', 'polararea', 'radar'].includes(type) ? {} : {
                        x: {
                            grid: { color: "rgba(255, 255, 255, 0.06)" },
                            ticks: { color: "#94a3b8", font: { size: 11 } }
                        },
                        y: {
                            grid: { color: "rgba(255, 255, 255, 0.06)" },
                            ticks: { color: "#94a3b8", font: { size: 11 } }
                        }
                    }
                }
            });
            window.__KINI_CHART_INSTANCES[chartId] = chartInstance;
        } catch(e) {
            console.warn("Lỗi vẽ biểu đồ Chart.js:", e);
        }
    });
}

function downloadChartImage(chartId) {
    const canvas = document.getElementById(chartId);
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `kini_chart_${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
}

function formatMarkdown(text) {
    if (!text) return "";
    
    // Nếu có marked.js (đã load từ CDN) thì dùng nó để render chuẩn như ChatGPT
    if (typeof marked !== "undefined") {
        try {
            // Cấu hình renderer cho code blocks với highlight.js
            const renderer = new marked.Renderer();
            renderer.code = function(code, lang) {
                // 1. Nhận diện khối biểu đồ dữ liệu Chart.js
                if (lang && ['chart', 'chartjs'].includes(lang.toLowerCase())) {
                    try {
                        const chartJson = JSON.parse(code.trim());
                        const chartId = "chart_" + Math.random().toString(36).substring(2, 9);
                        window.__KINI_CHARTS = window.__KINI_CHARTS || {};
                        window.__KINI_CHARTS[chartId] = chartJson;
                        const chartTitle = chartJson.title || "Biểu Đồ Trực Quan KINI AI";
                        return `<div class="kini-chart-card" id="card-${chartId}">
                            <div class="chart-header">
                                <div class="chart-header-left">
                                    <span class="chart-icon">📊</span>
                                    <strong class="chart-title">${escapeHtml(chartTitle)}</strong>
                                </div>
                                <button class="btn-chart-download" onclick="downloadChartImage('${chartId}')" title="Tải ảnh biểu đồ PNG">
                                    ⬇️ Tải Ảnh Biểu Đồ
                                </button>
                            </div>
                            <div class="chart-canvas-container">
                                <canvas id="${chartId}"></canvas>
                            </div>
                        </div>`;
                    } catch(err) {
                        console.warn("Lỗi phân tích JSON biểu đồ:", err);
                    }
                }

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
                const isPythonCandidate = (lang && ['python', 'py'].includes(lang.toLowerCase()));
                const runnerBtn = isRunnerCandidate ? `<button class="btn-run-artifact" onclick="launchArtifactRunner('${artifactId}')" title="Mở trực tiếp trên Web Preview & Game Runner">✨ Vibe Runner (Live)</button>` : "";
                const downloadBtn = isRunnerCandidate ? `<button class="btn-download-html" onclick="downloadArtifactHtml('${artifactId}')" title="Tải file HTML về máy dùng trực tiếp">⬇️ Tải HTML</button>` : "";
                const pythonBtn = isPythonCandidate ? `<button class="btn-run-code" onclick="executePythonSnippet(this, '${artifactId}')" title="Chạy mã Python và phân tích dữ liệu trực tiếp">▶️ Chạy mã</button>` : "";

                return `<div class="code-block-wrapper">
                    <div class="code-block-header">
                        ${langLabel}
                        <div style="display:flex;align-items:center;">
                            ${pythonBtn}
                            ${downloadBtn}
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
        const isPythonCandidate = (lang && ['python', 'py'].includes(lang.toLowerCase()));
        const runnerBtn = isRunnerCandidate ? `<button class="btn-run-artifact" onclick="launchArtifactRunner('${artifactId}')" title="Mở trực tiếp trên Web Preview & Game Runner">✨ Vibe Runner (Live)</button>` : "";
        const downloadBtn = isRunnerCandidate ? `<button class="btn-download-html" onclick="downloadArtifactHtml('${artifactId}')" title="Tải file HTML về máy dùng trực tiếp">⬇️ Tải HTML</button>` : "";
        const pythonBtn = isPythonCandidate ? `<button class="btn-run-code" onclick="executePythonSnippet(this, '${artifactId}')" title="Chạy mã Python và phân tích dữ liệu trực tiếp">▶️ Chạy mã</button>` : "";
        return `<div class="code-block-wrapper">
            <div class="code-block-header">
                <span class="code-lang-label">${lang || ''}</span>
                <div style="display:flex;align-items:center;">
                    ${pythonBtn}
                    ${downloadBtn}
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
// NÂNG CẤP 1: PYTHON CODE INTERPRETER & DATA SANDBOX
// ============================================================
async function executePythonSnippet(btn, artifactId) {
    const art = window.__KINI_ARTIFACTS[artifactId];
    if (!art || !art.code) return;
    
    const wrapper = btn.closest(".code-block-wrapper");
    if (!wrapper) return;
    
    let consoleEl = wrapper.querySelector(".code-output-console");
    if (consoleEl) consoleEl.remove();
    
    btn.disabled = true;
    const oldText = btn.innerHTML;
    btn.innerHTML = `⏳ Đang chạy...`;
    
    try {
        const res = await fetch("/api/code/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: art.code })
        });
        const data = await res.json();
        
        consoleEl = document.createElement("div");
        consoleEl.className = "code-output-console";
        
        const statusClass = data.success ? "status-success" : "status-error";
        const statusText = data.success ? `✅ Thực thi hoàn tất (ExitCode: ${data.returncode})` : `❌ Lỗi thực thi (ExitCode: ${data.returncode})`;
        
        let stdoutHtml = data.stdout ? `<div class="code-stdout">${escapeHtml(data.stdout)}</div>` : "";
        let stderrHtml = data.stderr ? `<div class="code-stderr">${escapeHtml(data.stderr)}</div>` : "";
        if (!data.stdout && !data.stderr && data.success) {
            stdoutHtml = `<div class="code-stdout" style="color:var(--text-muted);">(Chương trình kết thúc thành công - Không có dữ liệu in ra màn hình)</div>`;
        }
        
        let plotsHtml = "";
        if (data.plots && data.plots.length > 0) {
            plotsHtml = `<div class="code-plots-grid">`;
            data.plots.forEach((p, idx) => {
                plotsHtml += `
                    <div class="code-plot-card">
                        <img src="${p}" alt="Đồ thị Python ${idx+1}">
                        <a href="${p}" download="kini_python_chart_${idx+1}.png" class="btn-chart-download" style="display:inline-block;margin-top:4px;">⬇️ Tải đồ thị PNG</a>
                    </div>
                `;
            });
            plotsHtml += `</div>`;
        }
        
        consoleEl.innerHTML = `
            <div class="code-output-header">
                <span class="${statusClass}">${statusText}</span>
                <span>⏱️ ${data.elapsed || 0}s</span>
            </div>
            ${stdoutHtml}
            ${stderrHtml}
            ${plotsHtml}
        `;
        
        wrapper.appendChild(consoleEl);
    } catch(err) {
        showToast("❌ Lỗi khi thực thi Python: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = oldText;
    }
}


// ============================================================
// HẠN MỨC QUOTA & TOKEN THEO DÕI THỜI GIAN THỰC (CHUẨN ANTIGRAVITY)
// ============================================================
async function refreshUsageStats() {
    try {
        const res = await fetch("/api/usage");
        const data = await res.json();
        
        const dailyPercent = document.getElementById("usage-daily-percent");
        const dailyBar = document.getElementById("usage-daily-bar");
        const dailyReset = document.getElementById("usage-daily-reset");
        const rpmPercent = document.getElementById("usage-rpm-percent");
        const rpmBar = document.getElementById("usage-rpm-bar");
        const rpmDetail = document.getElementById("usage-rpm-detail");
        const totalTokens = document.getElementById("usage-total-tokens");
        const promptTokens = document.getElementById("usage-prompt-tokens");
        const candidateTokens = document.getElementById("usage-candidate-tokens");

        if (data.has_api_key === false) {
            if (dailyPercent) {
                dailyPercent.textContent = "Chưa có API Key (0%)";
                dailyPercent.style.color = "#f59e0b";
            }
            if (dailyBar) dailyBar.style.width = "0%";
            if (dailyReset) dailyReset.textContent = "⚠️ Nhập API Key riêng trong Cài đặt để có hạn mức";
            if (rpmPercent) rpmPercent.textContent = "0%";
            if (rpmBar) rpmBar.style.width = "0%";
            if (rpmDetail) rpmDetail.textContent = "0 / 0 lượt gọi (Chưa kích hoạt)";
            if (totalTokens) totalTokens.textContent = "0";
            if (promptTokens) promptTokens.textContent = "0";
            if (candidateTokens) candidateTokens.textContent = "0";
            return;
        }

        // Hạn mức ngày
        if (dailyPercent) {
            dailyPercent.textContent = `${data.daily_percent}% còn lại`;
            dailyPercent.style.color = "";
        }
        if (dailyBar) dailyBar.style.width = `${Math.min(100, Math.max(0, data.daily_percent))}%`;
        if (dailyReset) dailyReset.textContent = `Làm mới sau: ${data.resets_in} · ${data.daily_left.toLocaleString()} / ${data.daily_limit.toLocaleString()} lượt`;

        // RPM Tốc độ phút
        if (rpmPercent) rpmPercent.textContent = `${data.rpm_percent}% còn lại`;
        if (rpmBar) rpmBar.style.width = `${Math.min(100, Math.max(0, data.rpm_percent))}%`;
        if (rpmDetail) rpmDetail.textContent = `${data.rpm_current} / ${data.rpm_limit} lượt gọi trong phút này`;

        // Tokens
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

let isProgrammaticChange = false;

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
            if (isProgrammaticChange) return;
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
            if (isProgrammaticChange) return;
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

function setIdeCode(content, cmMode = "python", markClean = true) {
    ensureIdeEditorReady();
    isProgrammaticChange = true;
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
    isProgrammaticChange = false;

    if (markClean) {
        const dirtyDot = document.getElementById("ide-tab-dirty");
        if (dirtyDot) dirtyDot.style.display = "none";
    }
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

    try {
        const res = await fetch(`/api/agent/file?path=${encodeURIComponent(relPath)}`);
        const data = await res.json();
        if (data.success) {
            setIdeCode(data.content, cmMode, true);

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
    const isMaster = kiniClientId === "master";
    const msg = isMaster ? `⚠️ Anh Trường có chắc chắn muốn XÓA [${relPath}] vĩnh viễn không?` : `⚠️ Bạn có chắc chắn muốn XÓA [${relPath}] vĩnh viễn không?`;
    if (!confirm(msg)) return;
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
    document.getElementById("btn-preview-download")?.addEventListener("click", () => {
        const frame = document.getElementById("ide-preview-frame");
        let content = frame?.srcdoc || (window.ideEditor ? window.ideEditor.getValue() : "");
        if (!content) {
            if (typeof showToast === "function") showToast("⚠️ Chưa có mã nguồn ứng dụng để tải về.");
            return;
        }
        const blob = new Blob([content], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const tabName = document.getElementById("ide-tab-name")?.textContent || "vibe_app.html";
        a.download = tabName.endsWith(".html") ? tabName : (tabName + ".html");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (typeof showToast === "function") showToast("⬇️ Đã tải file ứng dụng HTML về máy!");
    });

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

// ============================================================
// NÂNG CẤP 2 & 4: DEEP RESEARCH & VOICE LIVE 2.0 DUPLEX
// ============================================================
let isDeepResearchMode = false;
let voiceLiveActive = false;
let voiceLiveRecognition = null;
let voiceLiveAudio = null;
let voiceLiveSilenceTimer = null;
let voiceLiveLastTranscript = "";
let voiceLiveMicEnabled = true;
let voiceLiveIsProcessing = false;
let voiceLiveState = "idle";

function initVoiceLive() {
    const btnOpen = document.getElementById("btn-voice-live");
    const overlay = document.getElementById("voice-live-overlay");
    const btnClose = document.getElementById("btn-close-voice-live");
    const btnEnd = document.getElementById("btn-voice-end-session");
    const btnToggleMic = document.getElementById("btn-voice-toggle-mic");

    if (btnOpen) {
        btnOpen.addEventListener("click", () => {
            startVoiceLiveSession();
        });
    }

    if (btnClose) {
        btnClose.addEventListener("click", () => {
            stopVoiceLiveSession();
        });
    }

    if (btnEnd) {
        btnEnd.addEventListener("click", () => {
            stopVoiceLiveSession();
        });
    }

    if (btnToggleMic) {
        btnToggleMic.addEventListener("click", () => {
            voiceLiveMicEnabled = !voiceLiveMicEnabled;
            btnToggleMic.textContent = voiceLiveMicEnabled ? "🎤 Mic: Bật" : "🔇 Mic: Tắt";
            if (!voiceLiveMicEnabled && voiceLiveRecognition) {
                try { voiceLiveRecognition.stop(); } catch(e) {}
                setVoiceLiveOrbState("idle", "Micro đã tạm tắt.");
            } else if (voiceLiveMicEnabled) {
                startVoiceLiveListening();
            }
        });
    }

    // Toggle Deep Research
    document.getElementById("btn-deep-research")?.addEventListener("click", () => {
        isDeepResearchMode = !isDeepResearchMode;
        document.getElementById("btn-deep-research")?.classList.toggle("active", isDeepResearchMode);
        const input = document.getElementById("main-user-input");
        if (isDeepResearchMode) {
            showToast("🔬 Đã BẬT Chế Độ Nghiên Cứu Sâu (Deep Research)! Nhập chủ đề cần nghiên cứu và gửi.");
            if (input) input.placeholder = "Nhập chủ đề muốn nghiên cứu sâu (Ví dụ: Dự báo thị trường bất động sản năm 2026)...";
        } else {
            showToast("Đã tắt chế độ nghiên cứu sâu.");
            if (input) input.placeholder = "Hỏi KINI bất kỳ điều gì...";
        }
    });
}

function setVoiceLiveOrbState(state, statusText = "") {
    const orb = document.getElementById("voice-live-orb");
    const statusEl = document.getElementById("voice-live-status");
    if (orb) {
        orb.className = "voice-live-orb " + (state === "listening" ? "listening" : (state === "speaking" ? "speaking" : ""));
    }
    if (statusEl && statusText) {
        statusEl.textContent = statusText;
    }
}

function appendVoiceLiveTranscript(role, text) {
    const box = document.getElementById("voice-live-transcript");
    if (!box) return;
    const line = document.createElement("div");
    line.className = "transcript-line " + (role === "user" ? "transcript-user" : "transcript-assistant");
    line.textContent = (role === "user" ? "Anh Trường: " : "KINI: ") + text;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
}

function startVoiceLiveSession() {
    const overlay = document.getElementById("voice-live-overlay");
    if (overlay) overlay.style.display = "flex";
    voiceLiveActive = true;
    voiceLiveMicEnabled = true;
    const btnToggleMic = document.getElementById("btn-voice-toggle-mic");
    if (btnToggleMic) btnToggleMic.textContent = "🎤 Mic: Bật";
    
    setVoiceLiveOrbState("listening", "Đang lắng nghe... Hãy nói bất cứ điều gì.");
    startVoiceLiveListening();
}

function stopVoiceLiveSession() {
    voiceLiveActive = false;
    voiceLiveIsProcessing = false;
    voiceLiveState = "idle";
    voiceLiveLastTranscript = "";
    if (voiceLiveSilenceTimer) {
        clearTimeout(voiceLiveSilenceTimer);
        voiceLiveSilenceTimer = null;
    }
    if (voiceLiveRecognition) {
        try {
            voiceLiveRecognition.onresult = null;
            voiceLiveRecognition.onend = null;
            voiceLiveRecognition.onerror = null;
            voiceLiveRecognition.stop();
        } catch(e) {}
        voiceLiveRecognition = null;
    }
    if (voiceLiveAudio) {
        try { voiceLiveAudio.pause(); } catch(e) {}
        voiceLiveAudio = null;
    }
    const overlay = document.getElementById("voice-live-overlay");
    if (overlay) overlay.style.display = "none";
    setVoiceLiveOrbState("idle", "Đã kết thúc đàm thoại.");
}

function startVoiceLiveListening() {
    if (!voiceLiveActive || !voiceLiveMicEnabled || voiceLiveIsProcessing || voiceLiveState === "speaking") return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        setVoiceLiveOrbState("idle", "Trình duyệt không hỗ trợ Web Speech API.");
        return;
    }

    try {
        if (voiceLiveRecognition) {
            voiceLiveRecognition.onresult = null;
            voiceLiveRecognition.onend = null;
            voiceLiveRecognition.onerror = null;
            voiceLiveRecognition.stop();
        }
    } catch(e) {}

    voiceLiveRecognition = new SpeechRecognition();
    voiceLiveRecognition.lang = "vi-VN";
    voiceLiveRecognition.continuous = true;
    voiceLiveRecognition.interimResults = true;

    voiceLiveState = "listening";
    voiceLiveLastTranscript = "";
    setVoiceLiveOrbState("listening", "Đang lắng nghe anh Trường...");

    voiceLiveRecognition.onresult = (event) => {
        // Nếu đang xử lý hoặc đang phát âm thanh thì tuyệt đối bỏ qua
        if (voiceLiveIsProcessing || voiceLiveState !== "listening") return;

        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                final += event.results[i][0].transcript;
            } else {
                interim += event.results[i][0].transcript;
            }
        }
        const textSpoken = (final || interim).trim();
        if (textSpoken) {
            voiceLiveLastTranscript = textSpoken;
            const statusEl = document.getElementById("voice-live-status");
            if (statusEl) statusEl.textContent = `"${textSpoken}"`;

            // Reset silence timer: im lặng 1.1s -> tự động chốt câu và gửi
            if (voiceLiveSilenceTimer) clearTimeout(voiceLiveSilenceTimer);
            voiceLiveSilenceTimer = setTimeout(() => {
                if (voiceLiveLastTranscript && !voiceLiveIsProcessing && voiceLiveState === "listening") {
                    const toSend = voiceLiveLastTranscript;
                    voiceLiveLastTranscript = "";
                    processVoiceLiveTurn(toSend);
                }
            }, 1100);
        }
    };

    voiceLiveRecognition.onerror = (e) => {
        if (e.error !== "no-speech") {
            console.warn("Voice live speech error:", e.error);
        }
    };

    voiceLiveRecognition.onend = () => {
        // CHỈ tự động start lại nếu đang ở trạng thái listening và KHÔNG phải đang processing hay speaking
        if (voiceLiveActive && voiceLiveMicEnabled && voiceLiveState === "listening" && !voiceLiveIsProcessing) {
            setTimeout(() => {
                if (voiceLiveActive && voiceLiveMicEnabled && voiceLiveState === "listening" && !voiceLiveIsProcessing) {
                    try { voiceLiveRecognition.start(); } catch(e) {}
                }
            }, 200);
        }
    };

    try {
        voiceLiveRecognition.start();
    } catch(e) {}
}

let voiceLiveLastSentText = "";
let voiceLiveLastSentTime = 0;

async function processVoiceLiveTurn(userSpokenText) {
    // Chặn tuyệt đối lặp lượt / race condition
    if (!voiceLiveActive || voiceLiveIsProcessing) return;
    const cleanSpoken = (userSpokenText || "").trim();
    if (!cleanSpoken) return;

    // Chặn gửi lặp lại cùng một câu trong vòng 3.5 giây (Chống trùng lặp Voice Live)
    const now = Date.now();
    if (cleanSpoken.toLowerCase() === voiceLiveLastSentText.toLowerCase() && (now - voiceLiveLastSentTime < 3500)) {
        return;
    }
    voiceLiveLastSentText = cleanSpoken;
    voiceLiveLastSentTime = now;
    
    voiceLiveIsProcessing = true;
    voiceLiveState = "processing";
    
    if (voiceLiveSilenceTimer) {
        clearTimeout(voiceLiveSilenceTimer);
        voiceLiveSilenceTimer = null;
    }
    voiceLiveLastTranscript = "";

    // Tắt ngay micro và gỡ bỏ onend để micro KHÔNG thu âm tiếng AI tự nói qua loa
    try {
        if (voiceLiveRecognition) {
            voiceLiveRecognition.onresult = null;
            voiceLiveRecognition.onend = null;
            voiceLiveRecognition.onerror = null;
            voiceLiveRecognition.stop();
        }
    } catch(e) {}
    
    setVoiceLiveOrbState("processing", "KINI AI đang suy nghĩ...");
    appendVoiceLiveTranscript("user", userSpokenText);

    try {
        const formData = new FormData();
        formData.append("conv_id", currentConvId);
        formData.append("message", userSpokenText);
        formData.append("model_mode", "flash");
        formData.append("agent_mode", currentAgentMode);
        formData.append("is_voice_live", "1");
        formData.append("platform", isDesktopApp ? "desktop" : "web");

        const res = await fetch("/api/chat", {
            method: "POST",
            body: formData
        });
        const data = await res.json();
        const reply = data.reply || "Dạ, em nghe rõ rồi ạ.";
        
        appendVoiceLiveTranscript("assistant", reply);

        // Gọi TTS để đọc câu trả lời với cơ chế đa tầng (Không bao giờ bị câm hoặc chậm trễ)
        voiceLiveState = "speaking";
        setVoiceLiveOrbState("speaking", "KINI AI đang trả lời...");

        let audioPlayed = false;

        const resumeListening = () => {
            if (voiceLiveActive) {
                setVoiceLiveOrbState("listening", "Đang lắng nghe lượt tiếp theo...");
                setTimeout(() => {
                    voiceLiveIsProcessing = false;
                    voiceLiveState = "listening";
                    startVoiceLiveListening();
                }, 350);
            }
        };

        const ttsController = new AbortController();
        const ttsTimeoutId = setTimeout(() => ttsController.abort(), 2600);

        try {
            const ttsRes = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    text: reply.substring(0, 250), 
                    voice: "female",
                    is_voice_live: true
                }),
                signal: ttsController.signal
            });
            clearTimeout(ttsTimeoutId);
            const ttsData = await ttsRes.json();

            if (ttsData.success && ttsData.audio_url && voiceLiveActive) {
                audioPlayed = true;
                voiceLiveAudio = new Audio(ttsData.audio_url);
                voiceLiveAudio.playbackRate = 1.15;

                voiceLiveAudio.onended = resumeListening;
                voiceLiveAudio.onerror = () => {
                    speakWithBrowserSpeech(reply, resumeListening);
                };
                await voiceLiveAudio.play().catch(() => {
                    speakWithBrowserSpeech(reply, resumeListening);
                });
            }
        } catch (ttsErr) {
            clearTimeout(ttsTimeoutId);
            console.warn("TTS máy chủ phản hồi chậm hoặc lỗi, phát ngay qua Web Speech API:", ttsErr);
        }

        // Nếu máy chủ TTS không phát được hoặc timeout -> Dùng ngay Browser Speech (0ms trễ, không bao giờ im lặng)
        if (!audioPlayed && voiceLiveActive) {
            speakWithBrowserSpeech(reply, resumeListening);
        }

    } catch(err) {
        console.warn("Lỗi xử lý Voice Live:", err);
        if (voiceLiveActive) {
            setVoiceLiveOrbState("listening", "Đã có lỗi kết nối. Hãy thử nói lại...");
            setTimeout(() => {
                voiceLiveIsProcessing = false;
                voiceLiveState = "listening";
                startVoiceLiveListening();
            }, 1000);
        }
    }
}


// ============================================================
// HỆ THỐNG DANH TÍNH THIẾT BỊ & HỒ SƠ GOOGLE PROFILE GEMINI
// ============================================================
let currentDeviceIdentity = null;

async function initDeviceIdentity() {
    const btnProfile = document.getElementById("btn-user-profile");
    const flyout = document.getElementById("google-profile-flyout");
    const btnCloseFlyout = document.getElementById("btn-close-g-profile");
    const btnEditFromFlyout = document.getElementById("btn-edit-identity-from-flyout");
    const btnCustomSettings = document.getElementById("btn-custom-identity-settings");
    const modalIdentity = document.getElementById("modal-device-identity");
    const btnCloseModal = modalIdentity?.querySelector(".modal-close");
    const btnQuickOwner = document.getElementById("btn-quick-set-owner");
    const btnSaveCustom = document.getElementById("btn-save-custom-identity");
    const btnLogout = document.getElementById("btn-action-logout");
    const btnOpenLoginFromFlyout = document.getElementById("btn-open-login-from-flyout");
    const btnLoginQuickOwner = document.getElementById("btn-login-quick-owner");
    const btnSubmitLogin = document.getElementById("btn-submit-login");

    // 1. Toggle Profile Flyout khi click vào User Pill
    if (btnProfile && flyout) {
        btnProfile.addEventListener("click", (e) => {
            e.stopPropagation();
            if (currentDeviceIdentity && !currentDeviceIdentity.is_logged_in) {
                const modalAuth = document.getElementById("modal-auth-login");
                if (modalAuth) modalAuth.style.display = "flex";
                return;
            }
            const isShown = flyout.style.display === "block";
            flyout.style.display = isShown ? "none" : "block";
        });
    }

    if (btnCloseFlyout && flyout) {
        btnCloseFlyout.addEventListener("click", (e) => {
            e.stopPropagation();
            flyout.style.display = "none";
        });
    }

    // Đóng khi click ra ngoài
    document.addEventListener("click", (e) => {
        if (flyout && flyout.style.display === "block") {
            if (!flyout.contains(e.target) && !btnProfile.contains(e.target)) {
                flyout.style.display = "none";
            }
        }
    });

    // 2. Mở Modal Cài đặt Danh tính
    const openIdentityModal = () => {
        if (flyout) flyout.style.display = "none";
        if (modalIdentity) {
            modalIdentity.style.display = "flex";
            if (currentDeviceIdentity) {
                const nameInp = document.getElementById("input-identity-user-name");
                const callInp = document.getElementById("input-identity-user-call");
                const aiCallSel = document.getElementById("select-identity-ai-call");
                if (nameInp) nameInp.value = currentDeviceIdentity.user_name || "";
                if (callInp) callInp.value = currentDeviceIdentity.user_call_name || "";
                if (aiCallSel) aiCallSel.value = currentDeviceIdentity.ai_call_name || "Em";
            }
        }
    };

    if (btnEditFromFlyout) btnEditFromFlyout.addEventListener("click", openIdentityModal);
    if (btnCustomSettings) btnCustomSettings.addEventListener("click", openIdentityModal);
    if (btnCloseModal) {
        btnCloseModal.addEventListener("click", () => {
            modalIdentity.style.display = "none";
        });
    }

    // Đăng xuất khỏi thiết bị
    const handleLogoutAction = async (e) => {
        if (e) e.stopPropagation();
        if (confirm("Anh có chắc muốn đăng xuất tài khoản khỏi thiết bị này không?")) {
            try {
                const res = await fetch("/api/auth/logout", { method: "POST" });
                if (res.ok) {
                    const data = await res.json();
                    currentDeviceIdentity = data;
                    renderDeviceIdentityUI(data);
                    if (flyout) flyout.style.display = "none";
                    showToast("🚪 Đã đăng xuất tài khoản thành công!");
                }
            } catch (err) {
                showToast("Lỗi khi đăng xuất: " + err.message, "error");
            }
        }
    };

    const btnQuickLogout = document.getElementById("btn-quick-logout");
    if (btnLogout) btnLogout.addEventListener("click", handleLogoutAction);
    if (btnQuickLogout) btnQuickLogout.addEventListener("click", handleLogoutAction);

    // Mở modal đăng nhập từ flyout
    const handleOpenLoginAction = (e) => {
        if (e) e.stopPropagation();
        if (flyout) flyout.style.display = "none";
        const modalAuth = document.getElementById("modal-auth-login");
        if (modalAuth) modalAuth.style.display = "flex";
    };

    const btnQuickOpenLogin = document.getElementById("btn-quick-open-login");
    if (btnOpenLoginFromFlyout) btnOpenLoginFromFlyout.addEventListener("click", handleOpenLoginAction);
    if (btnQuickOpenLogin) btnQuickOpenLogin.addEventListener("click", handleOpenLoginAction);

    // Đăng nhập nhanh 1-chạm Chủ Nhân
    if (btnLoginQuickOwner) {
        btnLoginQuickOwner.addEventListener("click", async () => {
            try {
                const res = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        is_owner: true,
                        user_name: "Truong Hai",
                        user_email: "haitruongproqt1@gmail.com",
                        user_call_name: "Anh Trường",
                        ai_call_name: "Em"
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    currentDeviceIdentity = data;
                    renderDeviceIdentityUI(data);
                    const modalAuth = document.getElementById("modal-auth-login");
                    if (modalAuth) modalAuth.style.display = "none";
                    showToast("👑 Chào mừng Anh Trường đã đăng nhập thành công!");
                }
            } catch (err) {
                showToast("Lỗi đăng nhập: " + err.message, "error");
            }
        });
    }

    // Form Đăng nhập Gmail / Tài khoản riêng
    if (btnSubmitLogin) {
        btnSubmitLogin.addEventListener("click", async () => {
            const name = document.getElementById("input-login-name")?.value.trim() || "Thành viên";
            const email = document.getElementById("input-login-email")?.value.trim() || "";
            const callName = document.getElementById("input-login-call")?.value.trim() || "Bạn";
            const aiCall = document.getElementById("select-login-ai-call")?.value || "Tôi";
            const apiKey = document.getElementById("input-login-apikey")?.value.trim() || "";

            const isOwner = email.toLowerCase().includes("haitruong") || callName.toLowerCase().includes("trường");

            try {
                const res = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        is_owner: isOwner,
                        user_name: name,
                        user_email: email,
                        user_call_name: callName,
                        ai_call_name: aiCall,
                        api_key: apiKey
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    currentDeviceIdentity = data;
                    renderDeviceIdentityUI(data);
                    const modalAuth = document.getElementById("modal-auth-login");
                    if (modalAuth) modalAuth.style.display = "none";
                    showToast(`✅ Đăng nhập thành công! Chào ${data.user_call_name || name}.`);
                }
            } catch (err) {
                showToast("Lỗi đăng nhập: " + err.message, "error");
            }
        });
    }

    // 3. Tùy chọn 1 chạm: Tôi là Anh Trường (Chủ nhân & Creator)
    if (btnQuickOwner) {
        btnQuickOwner.addEventListener("click", async () => {
            await setQuickIdentityOwner();
            if (modalIdentity) modalIdentity.style.display = "none";
        });
    }

    // 4. Lưu cài đặt tùy chỉnh cho khách / người khác
    if (btnSaveCustom) {
        btnSaveCustom.addEventListener("click", async () => {
            await saveCustomDeviceIdentity();
            if (modalIdentity) modalIdentity.style.display = "none";
        });
    }

    // 5. Tải danh tính hiện tại của thiết bị từ Backend
    await loadDeviceIdentity();
}

async function loadDeviceIdentity() {
    try {
        const res = await fetch("/api/device/identity");
        if (res.ok) {
            const data = await res.json();
            currentDeviceIdentity = data;
            renderDeviceIdentityUI(data);

            // Nếu thiết bị mới hoàn toàn chưa từng cấu hình danh tính
            if (!data.has_configured) {
                const modalOnboarding = document.getElementById("modal-onboarding-welcome");
                if (modalOnboarding) modalOnboarding.style.display = "flex";
            }
        }
    } catch(err) {
        console.warn("Lỗi tải danh tính thiết bị:", err);
    }
}

function initOnboardingWelcomeModal() {
    const modal = document.getElementById("modal-onboarding-welcome");
    if (!modal) return;

    // Chọn nhanh các pill xưng hô
    modal.querySelectorAll(".btn-onboard-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            const targetId = pill.dataset.target;
            const val = pill.dataset.val;
            const input = document.getElementById(targetId);
            if (input) input.value = val;

            const parentRow = pill.closest(".onboard-pills-row");
            if (parentRow) {
                parentRow.querySelectorAll(".btn-onboard-pill").forEach(p => p.classList.remove("active"));
                pill.classList.add("active");
            }
        });
    });

    // Bấm nút Hoàn tất Onboarding
    const btnSubmit = document.getElementById("btn-onboard-submit");
    if (btnSubmit) {
        btnSubmit.addEventListener("click", async () => {
            const name = (document.getElementById("input-onboard-name")?.value || "").trim();
            const email = (document.getElementById("input-onboard-email")?.value || "").trim();
            const userCall = (document.getElementById("input-onboard-user-call")?.value || "").trim() || "Bạn";
            const aiCall = (document.getElementById("input-onboard-ai-call")?.value || "").trim() || "Tôi";
            const apiKey = (document.getElementById("input-onboard-api-key")?.value || "").trim();

            if (!name) {
                alert("Vui lòng nhập tên hoặc biệt danh của bạn để KINI AI có thể phục vụ tốt nhất!");
                document.getElementById("input-onboard-name")?.focus();
                return;
            }

            btnSubmit.disabled = true;
            btnSubmit.textContent = "⏳ Đang thiết lập...";

            try {
                const res = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        user_name: name,
                        user_email: email,
                        user_call_name: userCall,
                        ai_call_name: aiCall,
                        api_key: apiKey,
                        is_owner: false
                    })
                });

                if (res.ok) {
                    modal.style.display = "none";
                    showToast(`🎉 Chào mừng ${userCall} ${name} đến với KINI AI!`);
                    await loadDeviceIdentity();

                    // Tự động chào đón người dùng mới
                    appendAssistantMessage(
                        `👋 Chào mừng **${userCall} ${name}**! Tôi là **${aiCall}** (KINI AI).\n\n` +
                        `✨ Không gian làm việc cá nhân của ${userCall} đã được khởi tạo thành công và độc lập 100% trên máy tính này.\n\n` +
                        `${userCall} muốn ${aiCall} hỗ trợ công việc gì hôm nay ạ?`
                    );
                } else {
                    alert("Có lỗi khi lưu cài đặt. Vui lòng thử lại!");
                }
            } catch(e) {
                console.error("Lỗi onboarding:", e);
                alert("Lỗi kết nối máy chủ. Vui lòng thử lại!");
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = "🚀 Bắt Đầu Trải Nghiệm KINI AI";
            }
        });
    }

    // Nút dùng thử Khách
    const btnSkipGuest = document.getElementById("btn-onboard-skip-guest");
    if (btnSkipGuest) {
        btnSkipGuest.addEventListener("click", () => {
            modal.style.display = "none";
            showToast("ℹ️ Bạn đang sử dụng ở chế độ Khách.");
        });
    }
}

function renderDeviceIdentityUI(data) {
    if (!data) return;

    const isLoggedIn = data.is_logged_in !== false;

    // Header Pill
    const hAvatar = document.getElementById("user-header-avatar");
    const hName = document.getElementById("user-header-name");
    const hPro = document.getElementById("user-header-pro");
    const btnProfile = document.getElementById("btn-user-profile");

    if (btnProfile) {
        if (!isLoggedIn) {
            btnProfile.classList.add("pill-logged-out");
            btnProfile.title = "Chưa đăng nhập (Bấm để đăng nhập tài khoản KINI AI)";
        } else {
            btnProfile.classList.remove("pill-logged-out");
            btnProfile.title = data.is_owner ? `Chủ nhân: ${data.user_call_name || data.user_name} (Bấm để xem/sửa xưng hô & tài khoản)` : `Tài khoản: ${data.user_name}`;
        }
    }

    if (hName) hName.textContent = !isLoggedIn ? "Đăng Nhập" : (data.is_owner ? (data.user_name || "Anh Trường") : (data.user_name || "Khách"));
    if (hAvatar) hAvatar.textContent = !isLoggedIn ? "👤" : (data.is_owner ? "👑" : (data.user_name || "U").substring(0, 1).toUpperCase());
    if (hPro) {
        hPro.style.display = (isLoggedIn && data.is_pro) ? "inline-block" : "none";
    }

    // Cập nhật câu chào Hero theo danh tính
    const heroTitle = document.getElementById("hero-title");
    if (heroTitle) {
        if (data.is_owner) {
            heroTitle.textContent = "Chào anh Trường! Em có thể giúp gì cho anh hôm nay?";
        } else if (isLoggedIn && data.user_call_name) {
            heroTitle.textContent = `Chào ${data.user_call_name}! KINI AI có thể giúp gì cho bạn hôm nay?`;
        } else {
            heroTitle.textContent = "Chào bạn! KINI AI có thể giúp gì cho bạn hôm nay?";
        }
    }

    // Flyout Card
    const fAvatar = document.getElementById("g-flyout-avatar");
    const fName = document.getElementById("g-flyout-name");
    const fEmail = document.getElementById("g-flyout-email");
    const fBadge = document.getElementById("g-flyout-pro-badge");
    const fTag = document.getElementById("g-flyout-device-tag");
    const statusCall = document.getElementById("g-status-call-name");
    const statusSub = document.getElementById("g-status-sub-text");

    if (fAvatar) fAvatar.textContent = !isLoggedIn ? "👤" : (data.user_name || "U").substring(0, 1).toUpperCase();
    if (fName) fName.textContent = !isLoggedIn ? "Chưa đăng nhập" : (data.is_owner ? (data.user_name || "Anh Trường") : (data.user_name || "Khách"));
    if (fEmail) fEmail.textContent = !isLoggedIn ? "Bấm nút bên dưới để đăng nhập" : (data.user_email || "Chưa liên kết email");
    if (fBadge) fBadge.style.display = (isLoggedIn && data.is_pro) ? "inline-block" : "none";
    if (fTag) {
        if (!isLoggedIn) {
            fTag.textContent = "⚡ Chế độ Khách (Chưa đăng nhập)";
            fTag.style.color = "#94a3b8";
            fTag.style.borderColor = "rgba(148, 163, 184, 0.3)";
        } else {
            fTag.textContent = data.is_owner ? "👑 Thiết bị Chủ Nhân" : "👤 Thiết bị Khách";
            fTag.style.color = data.is_owner ? "#00f2fe" : "#fbbf24";
            fTag.style.borderColor = data.is_owner ? "rgba(0, 242, 254, 0.3)" : "rgba(245, 158, 11, 0.3)";
        }
    }
    if (statusCall) statusCall.textContent = !isLoggedIn ? "Khách vãng lai" : (data.user_call_name || (data.is_owner ? "Anh Trường" : "Bạn"));
    if (statusSub) {
        if (!isLoggedIn) {
            statusSub.innerHTML = `Hãy đăng nhập để KINI AI nạp lại ký ức cá nhân và mở toàn bộ đặc quyền Pro.`;
        } else if (data.is_owner) {
            statusSub.innerHTML = `KINI AI sẽ luôn xưng <strong>"Em"</strong> và nạp toàn bộ ký ức dài hạn.`;
        } else {
            statusSub.innerHTML = `KINI AI sẽ xưng <strong>"${escapeHtml(data.ai_call_name || 'Tôi')}"</strong> và gọi bạn là <strong>"${escapeHtml(data.user_call_name || 'Bạn')}"</strong>.`;
        }
    }

    // Active item trong danh sách
    document.querySelectorAll(".g-account-item").forEach(item => item.classList.remove("active"));
    if (!isLoggedIn) {
        document.getElementById("g-acc-item-guest")?.classList.add("active");
    } else if (data.is_owner) {
        if (data.user_email === "haitruongpro94@gmail.com") {
            document.getElementById("g-acc-item-default")?.classList.add("active");
        } else {
            document.getElementById("g-acc-item-pro")?.classList.add("active");
        }
    } else {
        document.getElementById("g-acc-item-guest")?.classList.add("active");
    }
}

async function selectDeviceProfile(type) {
    if (type === "pro") {
        await saveDeviceIdentityAPI({
            is_owner: true,
            user_name: "Truong Hai",
            user_call_name: "Anh Trường",
            ai_call_name: "Em",
            user_email: "haitruongproqt1@gmail.com"
        });
        showToast("👑 Đã chọn hồ sơ Truong Hai Pro! KINI AI luôn xưng Em và gọi Anh Trường.");
    } else if (type === "default") {
        await saveDeviceIdentityAPI({
            is_owner: true,
            user_name: "Hải Trường",
            user_call_name: "Anh Trường",
            ai_call_name: "Em",
            user_email: "haitruongpro94@gmail.com"
        });
        showToast("👑 Đã chọn hồ sơ Hải Trường! KINI AI luôn xưng Em và gọi Anh Trường.");
    } else if (type === "guest") {
        const modalIdentity = document.getElementById("modal-device-identity");
        if (modalIdentity) modalIdentity.style.display = "flex";
        document.getElementById("google-profile-flyout").style.display = "none";
    }
}

async function setQuickIdentityOwner() {
    await saveDeviceIdentityAPI({
        is_owner: true,
        user_name: "Truong Hai",
        user_call_name: "Anh Trường",
        ai_call_name: "Em",
        user_email: "haitruongproqt1@gmail.com"
    });
    showToast("👑 Xác nhận thành công! Thiết bị này được ghi nhớ vĩnh viễn là của Anh Trường.");
}

async function saveCustomDeviceIdentity() {
    const name = document.getElementById("input-identity-user-name")?.value.trim() || "Khách";
    const callName = document.getElementById("input-identity-user-call")?.value.trim() || "Bạn";
    const aiCall = document.getElementById("select-identity-ai-call")?.value || "Tôi";

    await saveDeviceIdentityAPI({
        is_owner: false,
        user_name: name,
        user_call_name: callName,
        ai_call_name: aiCall,
        user_email: ""
    });
    showToast(`✅ Đã lưu! KINI AI sẽ xưng "${aiCall}" và gọi bạn là "${callName}".`);
}

async function saveDeviceIdentityAPI(payload) {
    try {
        const res = await fetch("/api/device/identity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            currentDeviceIdentity = data;
            renderDeviceIdentityUI(data);
        }
    } catch(e) {
        console.error("Lỗi lưu danh tính thiết bị:", e);
    }
}

// ============================================================
// KINI ART STUDIO - XƯỞNG TẠO ẢNH & LOGO 3D (FLUX.1 ENGINE)
// ============================================================
let currentStudioArtwork = null;

function remixPrompt(content) {
    const input = document.getElementById("main-user-input");
    if (!input) return;
    let basePrompt = content;
    const match = content.match(/Chủ đề:.*?["'](.*?)["']/i) || content.match(/Mô tả:.*?["'](.*?)["']/i);
    if (match && match[1]) {
        basePrompt = match[1];
    }
    input.value = `Tạo biến thể khác cho bức ảnh: ${basePrompt}, chi tiết hơn, ánh sáng đẹp hơn, 8k`;
    input.focus();
}

function copyImageUrl(url, btn) {
    const fullUrl = window.location.origin + url;
    navigator.clipboard.writeText(fullUrl);
    if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = `<span>✓</span> Đã Chép!`;
        setTimeout(() => btn.innerHTML = orig, 2000);
    }
}

function initArtStudio() {
    let selectedStyle = "3d";
    let selectedWidth = 1024;
    let selectedHeight = 1024;

    const openStudio = () => {
        openModal("modal-art-studio");
        loadRecentArtStrip();
    };

    document.getElementById("btn-mode-art")?.addEventListener("click", openStudio);
    document.getElementById("btn-open-art-studio")?.addEventListener("click", () => {
        closeSidebar();
        openStudio();
    });

    // Preset pills click
    document.querySelectorAll(".art-preset-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            const promptInput = document.getElementById("art-prompt-input");
            if (promptInput) {
                promptInput.value = pill.dataset.preset;
                promptInput.focus();
            }
        });
    });

    // Style selector cards
    document.querySelectorAll(".art-style-card").forEach(card => {
        card.addEventListener("click", () => {
            document.querySelectorAll(".art-style-card").forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            selectedStyle = card.dataset.style || "realistic";
        });
    });

    // Ratio selector buttons
    document.querySelectorAll(".art-ratio-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".art-ratio-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            selectedWidth = parseInt(btn.dataset.w || "1024");
            selectedHeight = parseInt(btn.dataset.h || "1024");
        });
    });

    // Submit Generate Button
    document.getElementById("btn-submit-generate-art")?.addEventListener("click", async () => {
        const promptInput = document.getElementById("art-prompt-input");
        const prompt = promptInput ? promptInput.value.trim() : "";
        if (!prompt) {
            alert("Vui lòng nhập mô tả hoặc chọn gợi ý bức ảnh bạn muốn vẽ!");
            promptInput?.focus();
            return;
        }

        const placeholder = document.getElementById("art-placeholder");
        const loading = document.getElementById("art-loading");
        const result = document.getElementById("art-result");
        const submitBtn = document.getElementById("btn-submit-generate-art");

        if (placeholder) placeholder.style.display = "none";
        if (result) result.style.display = "none";
        if (loading) loading.style.display = "flex";
        if (submitBtn) submitBtn.disabled = true;

        try {
            const res = await fetch("/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: prompt,
                    style: selectedStyle,
                    width: selectedWidth,
                    height: selectedHeight,
                    conv_id: currentConvId || "default"
                })
            });

            const data = await res.json();
            if (loading) loading.style.display = "none";
            if (submitBtn) submitBtn.disabled = false;

            if (res.ok && data.success) {
                currentStudioArtwork = data;
                if (result) result.style.display = "flex";
                const img = document.getElementById("art-result-img");
                if (img) img.src = data.image_url;
                const dl = document.getElementById("art-download-link");
                if (dl) dl.href = data.image_url;
                const meta = document.getElementById("art-result-meta");
                if (meta) {
                    meta.innerHTML = `<span>🎨 <b>Phong cách:</b> ${(data.style || selectedStyle).toUpperCase()}</span> <span>📐 <b>Kích thước:</b> ${data.width}x${data.height}</span> <span>⚡ <b>FLUX.1 Pro</b></span>`;
                }
                loadRecentArtStrip();

                // Tự động chèn tin nhắn vào đoạn chat hiện tại để hiển thị ngay trong feed
                appendAssistantMessage(
                    `🎨 **Tác phẩm mới tạo từ KINI Art Studio:**\n\n- 📝 **Chủ đề:** \"${data.prompt}\"\n- 🎭 **Phong cách:** ${(data.style || selectedStyle).toUpperCase()} (${data.width}x${data.height})\n- ⚡ **Động cơ AI:** FLUX.1 Pro Ultra HD`,
                    data.image_url,
                    true,
                    "FLUX.1 AI Engine"
                );
            } else {
                if (placeholder) placeholder.style.display = "flex";
                alert("⚠️ Không thể tạo ảnh lúc này: " + (data.detail || "Máy chủ tạo ảnh bận"));
            }
        } catch (err) {
            if (loading) loading.style.display = "none";
            if (placeholder) placeholder.style.display = "flex";
            if (submitBtn) submitBtn.disabled = false;
            alert("Lỗi kết nối tới máy chủ vẽ ảnh: " + err.message);
        }
    });

    // Send to Chat Button
    document.getElementById("btn-art-send-to-chat")?.addEventListener("click", () => {
        if (!currentStudioArtwork) return;
        appendAssistantMessage(
            `🎨 **Tác phẩm từ KINI Art Studio:**\n\n- 📝 **Chủ đề:** \"${currentStudioArtwork.prompt}\"\n- 🎭 **Phong cách:** ${(currentStudioArtwork.style || selectedStyle).toUpperCase()}`,
            currentStudioArtwork.image_url,
            true,
            "FLUX.1 AI Engine"
        );
        closeModal("modal-art-studio");
        scrollToBottom();
    });

    // Zoom Button
    document.getElementById("btn-art-zoom")?.addEventListener("click", () => {
        if (currentStudioArtwork && currentStudioArtwork.image_url) {
            openLightbox(currentStudioArtwork.image_url, currentStudioArtwork.prompt);
        }
    });

    // Open Gallery from Studio
    document.getElementById("btn-open-gallery-from-studio")?.addEventListener("click", () => {
        closeModal("modal-art-studio");
        openModal("modal-gallery");
        loadGallery();
    });
}

async function loadRecentArtStrip() {
    const strip = document.getElementById("art-recent-strip");
    if (!strip) return;
    try {
        const res = await fetch("/api/gallery");
        const data = await res.json();
        const items = (data.gallery || []).slice(0, 10);
        if (items.length === 0) {
            strip.innerHTML = "<span style='color:var(--text-muted);font-size:0.8rem;'>Chưa có tác phẩm nào</span>";
            return;
        }
        strip.innerHTML = "";
        items.forEach(it => {
            const thumb = document.createElement("img");
            thumb.src = it.image_url;
            thumb.className = "art-recent-thumb";
            thumb.title = it.prompt || "Tác phẩm AI";
            thumb.onclick = () => {
                currentStudioArtwork = it;
                const result = document.getElementById("art-result");
                const placeholder = document.getElementById("art-placeholder");
                if (placeholder) placeholder.style.display = "none";
                if (result) result.style.display = "flex";
                const img = document.getElementById("art-result-img");
                if (img) img.src = it.image_url;
                const dl = document.getElementById("art-download-link");
                if (dl) dl.href = it.image_url;
                const meta = document.getElementById("art-result-meta");
                if (meta) {
                    meta.innerHTML = `<span>🎨 <b>Phong cách:</b> ${(it.style||'3D').toUpperCase()}</span> <span>⚡ <b>FLUX.1</b></span>`;
                }
            };
            strip.appendChild(thumb);
        });
    } catch (e) {
        console.warn("Không thể tải recent art strip:", e);
    }
}

// ============================================================
// BẢNG ĐIỀU KHIỂN HỆ THỐNG (CONTROL CENTER & HARDWARE TELEMETRY)
// ============================================================
async function loadControlCenterData() {
    const valCpu = document.getElementById("cc-val-cpu");
    const barCpu = document.getElementById("cc-bar-cpu");
    const subCpu = document.getElementById("cc-sub-cpu");

    const valRam = document.getElementById("cc-val-ram");
    const barRam = document.getElementById("cc-bar-ram");
    const subRam = document.getElementById("cc-sub-ram");

    const valDiskh = document.getElementById("cc-val-diskh");
    const barDiskh = document.getElementById("cc-bar-diskh");
    const subDiskh = document.getElementById("cc-sub-diskh");

    const valDiskc = document.getElementById("cc-val-diskc");
    const barDiskc = document.getElementById("cc-bar-diskc");
    const subDiskc = document.getElementById("cc-sub-diskc");

    try {
        const res = await fetch("/api/system/hardware-stats");
        const data = await res.json();

        if (data.success) {
            if (valCpu) valCpu.textContent = `${data.cpu_percent}%`;
            if (barCpu) barCpu.style.width = `${Math.min(data.cpu_percent, 100)}%`;
            if (subCpu) subCpu.textContent = `Python ${data.python_version} (${data.platform})`;

            if (valRam) valRam.textContent = `${data.ram_percent}%`;
            if (barRam) barRam.style.width = `${Math.min(data.ram_percent, 100)}%`;
            if (subRam) subRam.textContent = `${data.ram_used_gb} GB / ${data.ram_total_gb} GB`;

            if (valDiskh) valDiskh.textContent = `${data.disk_h.percent}%`;
            if (barDiskh) barDiskh.style.width = `${Math.min(data.disk_h.percent, 100)}%`;
            if (subDiskh) subDiskh.textContent = `Trống: ${data.disk_h.free_gb} GB / ${data.disk_h.total_gb} GB`;

            if (valDiskc) valDiskc.textContent = `${data.disk_c.percent}%`;
            if (barDiskc) barDiskc.style.width = `${Math.min(data.disk_c.percent, 100)}%`;
            if (subDiskc) subDiskc.textContent = `Trống: ${data.disk_c.free_gb} GB / ${data.disk_c.total_gb} GB`;
        }
    } catch (e) {
        console.error("Lỗi tải thông số phần cứng:", e);
    }

    // Tải thông tin tự kiểm tra (Self-Check)
    await runSystemSelfCheck(false);
}

async function runSystemSelfCheck(showNotification = true) {
    const dot = document.getElementById("cc-health-dot");
    const title = document.getElementById("cc-health-title");
    const desc = document.getElementById("cc-health-desc");
    const logContent = document.getElementById("cc-log-content");
    const logTime = document.getElementById("cc-log-time");

    try {
        const res = await fetch("/api/system/self-check");
        const data = await res.json();

        if (logTime) {
            logTime.textContent = `Cập nhật: ${new Date().toLocaleTimeString()}`;
        }

        if (data.status === "healthy") {
            if (dot) dot.style.background = "#10b981";
            if (title) {
                title.textContent = "Hệ thống đang hoạt động tối ưu 100%!";
                title.style.color = "#34d399";
            }
            if (desc) desc.textContent = data.summary;
        } else {
            if (dot) dot.style.background = "#f59e0b";
            if (title) {
                title.textContent = "Hệ thống cần lưu ý!";
                title.style.color = "#fbbf24";
            }
            if (desc) desc.textContent = data.summary;
        }

        if (logContent && data.checks) {
            logContent.innerHTML = data.checks.map(c => {
                let icon = "✅";
                let color = "#34d399";
                if (c.status === "warning") { icon = "⚠️"; color = "#fbbf24"; }
                else if (c.status === "error") { icon = "❌"; color = "#f87171"; }
                return `
                    <div class="cc-check-row">
                        <span class="cc-check-icon">${icon}</span>
                        <div>
                            <span class="cc-check-title" style="color:${color};">${escapeHtml(c.name)}:</span>
                            <span class="cc-check-detail">${escapeHtml(c.detail)}</span>
                        </div>
                    </div>
                `;
            }).join("");
        }

        if (showNotification) {
            showToast("🔍 Đã quét và tự chữa lành toàn bộ hệ thống!");
        }
    } catch (e) {
        console.error("Lỗi self check:", e);
    }
}

async function cleanSystemCache() {
    const btn = document.getElementById("btn-cc-clean-cache");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span>⏳</span> Đang dọn...`;
    }
    try {
        const res = await fetch("/api/system/clean-cache", { method: "POST" });
        const data = await res.json();
        if (data.success) {
            showToast(`🧹 ${data.message}`);
            await loadControlCenterData();
        } else {
            showToast("❌ Không thể dọn dẹp cache: " + (data.message || "Lỗi không xác định"));
        }
    } catch (e) {
        showToast("❌ Lỗi mạng khi dọn dẹp: " + e.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<span>🧹</span> Dọn Ngay`;
        }
    }
}

async function backupSystemDatabase() {
    const btn = document.getElementById("btn-cc-backup-db");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span>⏳</span> Đang lưu...`;
    }
    try {
        const res = await fetch("/api/system/backup-database", { method: "POST" });
        const data = await res.json();
        if (data.success) {
            showToast(`💾 ${data.message}`);
            await loadControlCenterData();
        } else {
            showToast("❌ Không thể sao lưu: " + (data.message || "Lỗi không xác định"));
        }
    } catch (e) {
        showToast("❌ Lỗi mạng khi sao lưu: " + e.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<span>💾</span> Sao Lưu`;
        }
    }
}

function initControlCenter() {
    document.getElementById("btn-cc-run-selfcheck")?.addEventListener("click", () => runSystemSelfCheck(true));
    document.getElementById("btn-cc-clean-cache")?.addEventListener("click", cleanSystemCache);
    document.getElementById("btn-cc-backup-db")?.addEventListener("click", backupSystemDatabase);
    document.getElementById("btn-cc-refresh-all")?.addEventListener("click", loadControlCenterData);
}

// Khởi chạy Control Center
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initControlCenter);
} else {
    initControlCenter();
}



// ============================================================
// 5.1. KHO TRI THỨC TÀI LIỆU NỘI BỘ (LOCAL RAG INDEX)
// ============================================================
async function loadRagDocuments() {
    const box = document.getElementById("rag-doc-list");
    if (!box) return;
    try {
        const res = await fetch("/api/rag/documents");
        const data = await res.json();
        const docs = data.documents || [];
        if (docs.length === 0) {
            box.innerHTML = `<p style="color:var(--text-muted); margin:4px 0;">Chưa có tài liệu nào. Nạp file PDF/Word/Excel/TXT vào đây để KINI tra cứu chính xác khi bạn hỏi!</p>`;
            return;
        }
        box.innerHTML = docs.map(d => `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding:6px 10px; margin-bottom:6px; background:rgba(255,255,255,0.04); border-radius:8px;">
                <span>📄 <b>${escapeHtml(d.filename)}</b> <small style="color:var(--text-muted);">(${d.chunk_count} đoạn • ${d.char_count} ký tự)</small></span>
                <button class="btn btn-outline" style="padding:2px 8px; font-size:0.75rem;" onclick="deleteRagDocument(${d.id})">Xóa</button>
            </div>
        `).join("");
    } catch (e) {
        box.innerHTML = `<p style="color:#f87171;">Không tải được danh sách tài liệu RAG.</p>`;
    }
}

async function deleteRagDocument(docId) {
    await fetch(`/api/rag/documents/${docId}`, { method: "DELETE" });
    loadRagDocuments();
    if (typeof scheduleVaultSync === "function") scheduleVaultSync();
}

document.getElementById("rag-file-input")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const box = document.getElementById("rag-doc-list");
    if (box) box.innerHTML = `<p style="color:#60a5fa;">⏳ Đang đọc và lập chỉ mục tài liệu <b>${escapeHtml(file.name)}</b>...</p>`;
    const fd = new FormData();
    fd.append("file", file);
    try {
        const res = await fetch("/api/rag/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!data.success) {
            alert("Lỗi nạp tài liệu: " + (data.error || "Không rõ nguyên nhân"));
        }
    } catch (err) {
        alert("Lỗi kết nối khi nạp tài liệu: " + err.message);
    } finally {
        e.target.value = "";
        loadRagDocuments();
    }
});


// ============================================================
// MODAL XÁC NHẬN HIỆN ĐẠI (KINI PRO CONFIRM)
// ============================================================
function kiniConfirm(title = "Xác nhận xóa", message = "Bạn có chắc chắn muốn thực hiện thao tác này?", confirmLabel = "Xóa vĩnh viễn") {
    return new Promise((resolve) => {
        const modal = document.getElementById("modal-kini-confirm");
        const titleEl = document.getElementById("kini-confirm-title");
        const msgEl = document.getElementById("kini-confirm-msg");
        const btnOk = document.getElementById("kini-confirm-ok");
        const btnCancel = document.getElementById("kini-confirm-cancel");
        if (!modal || !btnOk || !btnCancel) {
            resolve(window.confirm(message));
            return;
        }
        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        btnOk.textContent = confirmLabel;
        modal.style.display = "flex";

        const cleanup = (result) => {
            modal.style.display = "none";
            btnOk.onclick = null;
            btnCancel.onclick = null;
            modal.onclick = null;
            resolve(result);
        };
        btnOk.onclick = () => cleanup(true);
        btnCancel.onclick = () => cleanup(false);
        modal.onclick = (e) => {
            if (e.target === modal) cleanup(false);
        };
    });
}


// ============================================================
// KÉT SẮT ĐỒNG BỘ VĨNH VIỄN TRÊN WEB (PERSISTENT WEB VAULT)
// ============================================================
let _vaultSyncTimer = null;
function scheduleVaultSync() {
    if (_vaultSyncTimer) clearTimeout(_vaultSyncTimer);
    _vaultSyncTimer = setTimeout(() => {
        if (typeof syncClientVaultToBrowser === "function") syncClientVaultToBrowser();
    }, 2500);
}

async function syncClientVaultToBrowser() {
    try {
        const res = await fetch("/api/client/vault");
        if (!res.ok) return;
        const vault = await res.json();
        localStorage.setItem("kini_vault_" + kiniClientId, JSON.stringify(vault));
    } catch (e) {}
}

async function restoreClientVaultFromBrowserIfNeeded() {
    try {
        const raw = localStorage.getItem("kini_vault_" + kiniClientId);
        if (!raw) {
            await syncClientVaultToBrowser();
            return;
        }
        const vault = JSON.parse(raw);
        const res = await fetch("/api/client/restore-vault", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(vault),
        });
        const data = await res.json();
        const r = data.restored || {};
        if ((r.settings || 0) > 0 || (r.memories || 0) > 0 || (r.rag_docs || 0) > 0) {
            if (typeof loadSettings === "function") loadSettings();
            if (typeof updateMemoryCountBadge === "function") updateMemoryCountBadge();
            if (typeof showToast === "function") {
                showToast("🛡️ Đã tự động khôi phục API Key, Ký ức & Tài liệu của bạn!");
            }
        } else {
            await syncClientVaultToBrowser();
        }
    } catch (e) {}
}
