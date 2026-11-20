// KINI AI - App Frontend Logic
let currentConvId = "default";
let selectedImageFile = null;

// ============================================================
// KHỞI ĐỘNG ỨNG DỤNG
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initChat();
    initStudio();
    initGallery();
    initSettings();
});

// ============================================================
// 1. ĐIỀU HƯỚNG TABS (DESKTOP & MOBILE BOTTOM BAR)
// ============================================================
function initNavigation() {
    window.switchTab = function(targetTab) {
        document.querySelectorAll(".nav-tab").forEach(tab => {
            tab.classList.toggle("active", tab.dataset.tab === targetTab);
        });
        document.querySelectorAll(".bottom-nav-item").forEach(item => {
            item.classList.toggle("active", item.dataset.tab === targetTab);
        });
        document.querySelectorAll(".tab-pane").forEach(pane => {
            pane.classList.toggle("active", pane.id === targetTab);
        });

        if (targetTab === "tab-gallery") {
            loadGallery();
        }
        if (targetTab === "tab-settings") {
            loadSettings();
        }
    };

    document.querySelectorAll(".nav-tab, .bottom-nav-item").forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.tab;
            if (target) switchTab(target);
        });
    });
}

// ============================================================
// 2. KINI CHAT LOGIC
// ============================================================
function initChat() {
    const chatForm = document.getElementById("chat-form");
    const chatInput = document.getElementById("chat-input");
    const chatMessages = document.getElementById("chat-messages");
    const fileInput = document.getElementById("chat-file-input");
    const attachBtn = document.getElementById("btn-attach-img");
    const previewBar = document.getElementById("chat-img-preview");
    const previewThumb = document.getElementById("preview-thumb");
    const previewName = document.getElementById("preview-name");
    const removeImgBtn = document.getElementById("btn-remove-img");
    const newChatTop = document.getElementById("btn-new-chat-top");
    const createConvBtn = document.getElementById("btn-create-conv");

    // Đính kèm ảnh
    attachBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedImageFile = file;
            previewName.textContent = file.name;
            const reader = new FileReader();
            reader.onload = (re) => {
                previewThumb.src = re.target.result;
                previewBar.style.display = "flex";
            };
            reader.readAsDataURL(file);
        }
    });

    removeImgBtn.addEventListener("click", () => {
        selectedImageFile = null;
        fileInput.value = "";
        previewBar.style.display = "none";
    });

    // Tạo cuộc trò chuyện mới
    async function startNewChat() {
        const newId = "conv_" + Date.now().toString(36);
        currentConvId = newId;
        try {
            await fetch("/api/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: "Cuộc trò chuyện mới" })
            });
            loadConversations();
            chatMessages.innerHTML = `
                <div class="message-row assistant">
                    <div class="avatar-badge">🤖</div>
                    <div class="message-content">
                        <div class="sender-name">KINI AI</div>
                        <div class="bubble-text">
                            <p>Cuộc hội thoại mới đã sẵn sàng! Em có thể giúp gì cho <b>anh Hải Trường</b> hôm nay?</p>
                        </div>
                    </div>
                </div>
            `;
            chatInput.focus();
        } catch (e) {
            console.error(e);
        }
    }

    if (newChatTop) newChatTop.addEventListener("click", startNewChat);
    if (createConvBtn) createConvBtn.addEventListener("click", startNewChat);

    // Gợi ý nhanh
    document.querySelectorAll(".prompt-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            chatInput.value = chip.dataset.prompt;
            chatInput.focus();
        });
    });

    // Auto-expand textarea
    chatInput.addEventListener("input", () => {
        chatInput.style.height = "auto";
        chatInput.style.height = (chatInput.scrollHeight) + "px";
    });

    // Enter để gửi (Shift+Enter để xuống dòng)
    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            chatForm.dispatchEvent(new Event("submit"));
        }
    });

    // Gửi tin nhắn
    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text && !selectedImageFile) return;

        // Thêm tin nhắn user lên UI
        appendChatMessage("user", text, selectedImageFile ? previewThumb.src : "");

        const currentImg = selectedImageFile;
        // Reset form
        chatInput.value = "";
        chatInput.style.height = "auto";
        selectedImageFile = null;
        fileInput.value = "";
        previewBar.style.display = "none";

        // Thêm bubble thinking của KINI
        const thinkingId = "thinking-" + Date.now();
        const thinkingDiv = document.createElement("div");
        thinkingDiv.className = "message-row assistant";
        thinkingDiv.id = thinkingId;
        thinkingDiv.innerHTML = `
            <div class="avatar-badge">🤖</div>
            <div class="message-content">
                <div class="sender-name">KINI AI</div>
                <div class="bubble-text"><i>KINI đang suy nghĩ câu trả lời...</i></div>
            </div>
        `;
        chatMessages.appendChild(thinkingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const formData = new FormData();
            formData.append("conv_id", currentConvId);
            formData.append("message", text || "Hãy xem và phân tích bức ảnh này giúp tôi");
            if (currentImg) {
                formData.append("image", currentImg);
            }

            const res = await fetch("/api/chat", {
                method: "POST",
                body: formData
            });
            const data = await res.json();

            // Xóa bubble thinking
            const th = document.getElementById(thinkingId);
            if (th) th.remove();

            appendChatMessage("assistant", data.reply);
        } catch (err) {
            const th = document.getElementById(thinkingId);
            if (th) th.remove();
            appendChatMessage("assistant", "❌ Lỗi kết nối: " + err.message);
        }
    });

    loadConversations();
}

function appendChatMessage(role, text, imageSrc) {
    const chatMessages = document.getElementById("chat-messages");
    const row = document.createElement("div");
    row.className = `message-row ${role}`;
    
    let imgHtml = "";
    if (imageSrc) {
        imgHtml = `<img src="${imageSrc}" class="bubble-image" alt="attached image">`;
    }

    row.innerHTML = `
        <div class="avatar-badge">${role === 'assistant' ? '🤖' : '👤'}</div>
        <div class="message-content">
            <div class="sender-name">${role === 'assistant' ? 'KINI AI' : 'Bạn'}</div>
            <div class="bubble-text">
                ${imgHtml}
                <div>${formatResponseText(text)}</div>
            </div>
        </div>
    `;
    chatMessages.appendChild(row);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatResponseText(text) {
    if (!text) return "";
    return text
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\*(.*?)\*/g, '<i>$1</i>')
        .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;">$1</code>')
        .replace(/\n/g, '<br>');
}

async function loadConversations() {
    try {
        const res = await fetch("/api/conversations");
        const data = await res.json();
        const convList = document.getElementById("conv-list");
        if (!convList) return;
        convList.innerHTML = "";
        
        data.conversations.forEach(c => {
            const item = document.createElement("div");
            item.className = `conv-item ${c.id === currentConvId ? 'active' : ''}`;
            item.textContent = c.title;
            item.addEventListener("click", () => {
                currentConvId = c.id;
                document.querySelectorAll(".conv-item").forEach(ci => ci.classList.remove("active"));
                item.classList.add("active");
                loadConversationMessages(c.id);
            });
            convList.appendChild(item);
        });
    } catch (e) {
        console.error("Lỗi tải hội thoại:", e);
    }
}

async function loadConversationMessages(convId) {
    try {
        const res = await fetch(`/api/conversations/${convId}/messages`);
        const data = await res.json();
        const chatMessages = document.getElementById("chat-messages");
        chatMessages.innerHTML = "";
        data.messages.forEach(m => {
            appendChatMessage(m.role, m.content, m.image_url);
        });
    } catch (e) {
        console.error(e);
    }
}

// ============================================================
// 3. KINI STUDIO (AI IMAGE GENERATOR) LOGIC
// ============================================================
function initStudio() {
    const promptInput = document.getElementById("studio-prompt");
    const generateBtn = document.getElementById("btn-generate-image");
    const placeholder = document.getElementById("result-placeholder");
    const spinner = document.getElementById("generating-spinner");
    const resultBox = document.getElementById("generated-display");
    const mainImg = document.getElementById("main-generated-img");
    const metaTag = document.getElementById("meta-style-tag");
    const metaPrompt = document.getElementById("meta-prompt-text");
    const downloadBtn = document.getElementById("btn-download-art");
    const copyBtn = document.getElementById("btn-copy-prompt");

    // Click gợi ý mẫu
    document.querySelectorAll(".example-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            promptInput.value = btn.dataset.text;
            promptInput.focus();
        });
    });

    // Style chips toggle
    document.querySelectorAll(".style-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            document.querySelectorAll(".style-chip").forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            chip.querySelector("input").checked = true;
        });
    });

    // Ratio chips toggle
    document.querySelectorAll(".ratio-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            document.querySelectorAll(".ratio-chip").forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            chip.querySelector("input").checked = true;
        });
    });

    // Bắt đầu vẽ ảnh
    generateBtn.addEventListener("click", async () => {
        const prompt = promptInput.value.trim();
        if (!prompt) {
            alert("Vui lòng nhập mô tả bức ảnh bạn muốn vẽ!");
            promptInput.focus();
            return;
        }

        const selectedStyle = document.querySelector("input[name='studio-style']:checked")?.value || "realistic";
        const selectedRatio = document.querySelector("input[name='studio-ratio']:checked")?.value || "1024x1024";
        const [w, h] = selectedRatio.split("x").map(Number);

        // Hiển thị trạng thái đang vẽ
        placeholder.style.display = "none";
        resultBox.style.display = "none";
        spinner.style.display = "block";
        generateBtn.disabled = true;

        try {
            const res = await fetch("/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: prompt,
                    style: selectedStyle,
                    width: w,
                    height: h
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Không thể tạo ảnh");
            }

            const data = await res.json();

            // Hiển thị kết quả ảnh
            spinner.style.display = "none";
            resultBox.style.display = "block";
            mainImg.src = data.image_url;
            metaTag.textContent = `Phong cách: ${data.style.toUpperCase()}`;
            metaPrompt.textContent = data.prompt;
            downloadBtn.href = data.image_url;
            downloadBtn.download = `kini_ai_${Date.now()}.jpg`;

            // Click vào ảnh để phóng to
            mainImg.onclick = () => openLightbox(data.image_url, data.prompt);

        } catch (err) {
            spinner.style.display = "none";
            placeholder.style.display = "block";
            alert("Lỗi tạo ảnh: " + err.message);
        } finally {
            generateBtn.disabled = false;
        }
    });

    // Nút sao chép prompt
    copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(metaPrompt.textContent);
        alert("Đã sao chép mô tả ảnh vào bộ nhớ tạm!");
    });
}

// ============================================================
// 4. PHÒNG TRƯNG BÀY (GALLERY)
// ============================================================
async function loadGallery() {
    const grid = document.getElementById("gallery-grid");
    if (!grid) return;
    grid.innerHTML = "<p style='color:var(--text-muted);'>Đang tải thư viện ảnh...</p>";

    try {
        const res = await fetch("/api/gallery");
        const data = await res.json();
        
        if (!data.gallery || data.gallery.length === 0) {
            grid.innerHTML = "<p style='color:var(--text-muted);grid-column:1/-1;text-align:center;'>Chưa có bức ảnh nào trong bộ sưu tập. Hãy sang tab <b>KINI Studio</b> để sáng tạo bức ảnh đầu tiên!</p>";
            return;
        }

        grid.innerHTML = "";
        data.gallery.forEach(item => {
            const card = document.createElement("div");
            card.className = "gallery-card";
            card.innerHTML = `
                <img src="${item.image_url}" alt="AI artwork" loading="lazy">
                <div class="gallery-card-body">
                    <p class="gallery-prompt">${item.prompt}</p>
                </div>
            `;
            card.addEventListener("click", () => openLightbox(item.image_url, item.prompt));
            grid.appendChild(card);
        });
    } catch (e) {
        grid.innerHTML = "<p style='color:var(--danger);'>Không thể tải thư viện ảnh.</p>";
    }
}

// Lightbox Modal
function openLightbox(imgUrl, promptText) {
    const modal = document.getElementById("lightbox-modal");
    const img = document.getElementById("lightbox-img");
    const prompt = document.getElementById("lightbox-prompt");
    const dl = document.getElementById("lightbox-download");

    img.src = imgUrl;
    prompt.textContent = promptText;
    dl.href = imgUrl;
    dl.download = `kini_ai_art.jpg`;
    modal.style.display = "flex";

    document.getElementById("lightbox-close").onclick = () => {
        modal.style.display = "none";
    };
    modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = "none";
    };
}

// ============================================================
// 5. CÀI ĐẶT (SETTINGS)
// ============================================================
async function loadSettings() {
    try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        const keyInput = document.getElementById("setting-gemini-key");
        const personaInput = document.getElementById("setting-persona");

        if (data.gemini_api_key) {
            keyInput.value = data.gemini_api_key;
        }
        if (data.custom_persona) {
            personaInput.value = data.custom_persona;
        }
    } catch (e) {
        console.error(e);
    }
}

function initSettings() {
    const saveKeyBtn = document.getElementById("btn-save-api-key");
    const savePersonaBtn = document.getElementById("btn-save-persona");

    saveKeyBtn.addEventListener("click", async () => {
        const key = document.getElementById("setting-gemini-key").value.trim();
        try {
            await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ gemini_api_key: key })
            });
            alert("Đã lưu Google Gemini API Key thành công!");
        } catch (e) {
            alert("Lỗi lưu cài đặt: " + e);
        }
    });

    savePersonaBtn.addEventListener("click", async () => {
        const persona = document.getElementById("setting-persona").value.trim();
        try {
            await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ custom_persona: persona })
            });
            alert("Đã lưu tính cách KINI AI thành công!");
        } catch (e) {
            alert("Lỗi lưu tính cách: " + e);
        }
    });
}
