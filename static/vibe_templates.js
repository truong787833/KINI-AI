/**
 * KINI AI - VIBE CODING TEMPLATES & HUB ENGINE
 * Cung cấp kho ứng dụng, game mini, công cụ bán hàng và hiệu ứng canvas tương tác 1 chạm.
 */

window.VIBE_TEMPLATES = [
    {
        id: "chipchip_order",
        title: "Quản Lý Đơn Kẹo ChipChip Mây & Gạo",
        category: "app",
        icon: "🍬",
        badge: "Gia Đình & Bán Hàng",
        desc: "Bảng tính đơn kẹo, tự động đổi lạng sang kg, nhân giá tiền, tính tổng doanh thu chuẩn 100% và in hóa đơn đẹp mắt.",
        tags: ["Quản lý", "Bán hàng", "Tính tiền", "Kẹo ChipChip"],
        code: `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quản Lý Đơn Kẹo ChipChip Mây & Gạo</title>
    <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #f97316;
            --primary-light: #fff7ed;
            --accent: #ec4899;
            --text-dark: #1e293b;
            --bg: #f8fafc;
            --card: #ffffff;
            --border: #fed7aa;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Quicksand', sans-serif; }
        body { background: var(--bg); color: var(--text-dark); padding: 20px; }
        .container { max-width: 900px; margin: 0 auto; }
        .header { display: flex; align-items: center; justify-content: space-between; background: linear-gradient(135deg, #ffedd5, #fce7f3); padding: 18px 24px; border-radius: 16px; border: 2px solid var(--border); margin-bottom: 20px; box-shadow: 0 4px 15px rgba(249, 115, 22, 0.1); }
        .header-title { font-size: 1.4rem; font-weight: 700; color: #c2410c; display: flex; align-items: center; gap: 10px; }
        .header-badge { background: #f97316; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; }
        .grid-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px; }
        .stat-card { background: var(--card); padding: 16px; border-radius: 14px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .stat-label { font-size: 0.85rem; color: #64748b; font-weight: 600; margin-bottom: 6px; }
        .stat-value { font-size: 1.5rem; font-weight: 700; color: #0f172a; }
        .stat-value.highlight { color: #ea580c; }
        .form-card { background: var(--card); padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .form-row { display: grid; grid-template-columns: 2fr 1fr 1.5fr 1fr; gap: 12px; margin-top: 12px; }
        @media (max-width: 640px) { .form-row { grid-template-columns: 1fr; } }
        .form-input { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 0.95rem; outline: none; transition: all 0.2s; }
        .form-input:focus { border-color: #f97316; box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.2); }
        .btn-add { background: linear-gradient(135deg, #f97316, #ea580c); color: white; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; padding: 10px; transition: all 0.2s; }
        .btn-add:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3); }
        .table-card { background: var(--card); border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        table { width: 100%; border-collapse: collapse; text-align: left; }
        th { background: #f8fafc; padding: 12px 16px; font-size: 0.85rem; color: #475569; font-weight: 700; border-bottom: 1px solid #e2e8f0; }
        td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-size: 0.95rem; }
        tr:hover { background: #fffaf5; }
        .btn-del { background: #fee2e2; color: #ef4444; border: none; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-weight: bold; }
        .btn-del:hover { background: #fca5a5; color: white; }
        .btn-print { background: #0284c7; color: white; border: none; padding: 8px 16px; border-radius: 10px; font-weight: 700; cursor: pointer; margin-top: 16px; float: right; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-title">
                <span>🍬</span> Quản Lý Đơn Kẹo ChipChip Mây & Gạo
            </div>
            <div class="header-badge">Hệ Thống Bán Hàng Vibe</div>
        </div>

        <div class="grid-stats">
            <div class="stat-card">
                <div class="stat-label">Tổng Số Đơn Hàng</div>
                <div class="stat-value" id="stat-total-orders">3 đơn</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Tổng Khối Lượng (Lạng)</div>
                <div class="stat-value" id="stat-total-lang">126 lạng</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Quy Đổi Khối Lượng (Kg)</div>
                <div class="stat-value" id="stat-total-kg">12.6 kg</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Tổng Doanh Thu Ước Tính</div>
                <div class="stat-value highlight" id="stat-total-money">2,520,000 đ</div>
            </div>
        </div>

        <div class="form-card">
            <h3 style="font-size: 1rem; color: #334155;">➕ Thêm Đơn Hàng Mới</h3>
            <div class="form-row">
                <input type="text" id="cust-name" class="form-input" placeholder="Tên khách hàng (VD: Chị Mai)">
                <input type="number" id="cust-lang" class="form-input" placeholder="Số lạng (VD: 33)" min="1">
                <input type="number" id="cust-price" class="form-input" placeholder="Đơn giá/lạng (VD: 20000)" value="20000">
                <button class="btn-add" onclick="addOrder()">+ Thêm Đơn</button>
            </div>
        </div>

        <div class="table-card">
            <table>
                <thead>
                    <tr>
                        <th>Khách Hàng</th>
                        <th>Khối Lượng (Lạng)</th>
                        <th>Quy Đổi (Kg)</th>
                        <th>Đơn Giá / Lạng</th>
                        <th>Thành Tiền</th>
                        <th>Thao Tác</th>
                    </tr>
                </thead>
                <tbody id="order-rows">
                </tbody>
            </table>
        </div>
        <button class="btn-print" onclick="window.print()">🖨️ In Danh Sách / Xuất Hóa Đơn</button>
    </div>

    <script>
        let orders = [
            { id: 1, name: "Cô Thanh & Cô Nhàn", lang: 33, price: 20000 },
            { id: 2, name: "Cô Trà My & C.Khánh", lang: 50, price: 20000 },
            { id: 3, name: "Mụ Hoa Gạo & A.Đức", lang: 43, price: 20000 }
        ];

        function renderOrders() {
            const tbody = document.getElementById("order-rows");
            tbody.innerHTML = "";
            let totalLang = 0;
            let totalMoney = 0;

            orders.forEach(o => {
                const kg = (o.lang / 10).toFixed(1);
                const money = o.lang * o.price;
                totalLang += o.lang;
                totalMoney += money;

                const tr = document.createElement("tr");
                tr.innerHTML = \`
                    <td><strong>\${o.name}</strong></td>
                    <td><span style="background:#fed7aa;padding:2px 8px;border-radius:6px;font-weight:700;">\${o.lang} lạng</span></td>
                    <td><strong>\${kg} kg</strong></td>
                    <td>\${o.price.toLocaleString('vi-VN')} đ</td>
                    <td style="color:#ea580c;font-weight:700;">\${money.toLocaleString('vi-VN')} đ</td>
                    <td><button class="btn-del" onclick="deleteOrder(\${o.id})">✕</button></td>
                \`;
                tbody.appendChild(tr);
            });

            document.getElementById("stat-total-orders").textContent = orders.length + " đơn";
            document.getElementById("stat-total-lang").textContent = totalLang + " lạng";
            document.getElementById("stat-total-kg").textContent = (totalLang / 10).toFixed(1) + " kg";
            document.getElementById("stat-total-money").textContent = totalMoney.toLocaleString('vi-VN') + " đ";
        }

        function addOrder() {
            const name = document.getElementById("cust-name").value.trim();
            const lang = parseFloat(document.getElementById("cust-lang").value);
            const price = parseFloat(document.getElementById("cust-price").value) || 20000;

            if (!name || isNaN(lang) || lang <= 0) {
                alert("Vui lòng nhập tên khách và số lạng hợp lệ!");
                return;
            }

            orders.push({ id: Date.now(), name, lang, price });
            document.getElementById("cust-name").value = "";
            document.getElementById("cust-lang").value = "";
            renderOrders();
        }

        function deleteOrder(id) {
            orders = orders.filter(o => o.id !== id);
            renderOrders();
        }

        renderOrders();
    </script>
</body>
</html>`
    },
    {
        id: "flappy_cute",
        title: "Flappy Bird - Cute Edition",
        category: "game",
        icon: "🐥",
        badge: "Arcade Game",
        desc: "Tựa game huyền thoại với physics trọng lực mượt mà, hiệu ứng âm thanh tổng hợp Web Audio API (nhảy, ghi điểm, game over).",
        tags: ["Game", "Canvas", "Web Audio", "Vui nhộn"],
        code: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Flappy Bird Cute</title>
    <style>
        body { margin: 0; background: #0f172a; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; color: white; }
        canvas { background: #38bdf8; border: 3px solid #0284c7; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); cursor: pointer; }
        .hint { margin-top: 10px; color: #94a3b8; font-size: 0.9rem; }
    </style>
</head>
<body>
    <canvas id="c" width="400" height="550"></canvas>
    <div class="hint">Bấm phím <strong>SPACE</strong> hoặc <strong>Click Chuột / Chạm màn hình</strong> để bay!</div>
    <script>
        const c = document.getElementById('c'), ctx = c.getContext('2d');
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        function playTone(freq, dur, type='sine') {
            try {
                const osc = audioCtx.createOscillator(), g = audioCtx.createGain();
                osc.type = type; osc.frequency.value = freq;
                g.gain.setValueAtTime(0.1, audioCtx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
                osc.connect(g); g.connect(audioCtx.destination);
                osc.start(); osc.stop(audioCtx.currentTime + dur);
            } catch(e){}
        }

        let bird = { x: 80, y: 250, vy: 0, rad: 16 };
        let pipes = [], score = 0, best = 0, state = 'START';
        const GRAV = 0.35, JUMP = -6.5;

        function reset() {
            bird.y = 250; bird.vy = 0; pipes = []; score = 0; state = 'PLAY';
        }

        function jump() {
            if (state === 'START' || state === 'OVER') { reset(); return; }
            bird.vy = JUMP;
            playTone(480, 0.1, 'square');
        }

        window.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); jump(); } });
        c.addEventListener('pointerdown', jump);

        let frame = 0;
        function loop() {
            frame++;
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(0, 0, 400, 550);

            // Ground
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(0, 500, 400, 50);

            if (state === 'PLAY') {
                bird.vy += GRAV;
                bird.y += bird.vy;

                if (frame % 90 === 0) {
                    const topH = Math.floor(Math.random() * 220) + 50;
                    pipes.push({ x: 400, top: topH, gap: 140, passed: false });
                }

                pipes.forEach(p => {
                    p.x -= 2.5;
                    if (!p.passed && p.x + 50 < bird.x) {
                        p.passed = true; score++;
                        if (score > best) best = score;
                        playTone(720, 0.15, 'triangle');
                    }
                    if (bird.x + bird.rad > p.x && bird.x - bird.rad < p.x + 50) {
                        if (bird.y - bird.rad < p.top || bird.y + bird.rad > p.top + p.gap) {
                            state = 'OVER'; playTone(160, 0.4, 'sawtooth');
                        }
                    }
                });
                pipes = pipes.filter(p => p.x > -60);

                if (bird.y + bird.rad > 500 || bird.y - bird.rad < 0) {
                    state = 'OVER'; playTone(160, 0.4, 'sawtooth');
                }
            }

            // Draw Pipes
            pipes.forEach(p => {
                ctx.fillStyle = '#15803d';
                ctx.fillRect(p.x, 0, 50, p.top);
                ctx.fillRect(p.x, p.top + p.gap, 50, 500 - (p.top + p.gap));
                ctx.fillStyle = '#16a34a';
                ctx.fillRect(p.x - 4, p.top - 18, 58, 18);
                ctx.fillRect(p.x - 4, p.top + p.gap, 58, 18);
            });

            // Draw Bird (Cute Yellow Chick)
            ctx.save();
            ctx.translate(bird.x, bird.y);
            ctx.rotate(Math.min(Math.PI/4, Math.max(-Math.PI/4, bird.vy * 0.08)));
            ctx.fillStyle = '#facc15';
            ctx.beginPath(); ctx.arc(0, 0, bird.rad, 0, Math.PI*2); ctx.fill();
            // Wing
            ctx.fillStyle = '#eab308';
            ctx.beginPath(); ctx.ellipse(-4, 2, 8, 5, 0, 0, Math.PI*2); ctx.fill();
            // Eye
            ctx.fillStyle = '#0f172a';
            ctx.beginPath(); ctx.arc(6, -4, 3.5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(7.5, -5, 1.2, 0, Math.PI*2); ctx.fill();
            // Beak
            ctx.fillStyle = '#f97316';
            ctx.beginPath(); ctx.moveTo(12, -2); ctx.lineTo(20, 2); ctx.lineTo(12, 6); ctx.fill();
            ctx.restore();

            // Score HUD
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 32px sans-serif';
            ctx.textAlign = 'center';
            if (state === 'PLAY') {
                ctx.fillText(score, 200, 60);
            } else if (state === 'START') {
                ctx.fillText('FLAPPY BIRD CUTE', 200, 180);
                ctx.font = '18px sans-serif';
                ctx.fillText('Bấm vào màn hình để bắt đầu!', 200, 230);
            } else if (state === 'OVER') {
                ctx.fillStyle = '#ef4444';
                ctx.fillText('GAME OVER', 200, 180);
                ctx.fillStyle = '#fff';
                ctx.font = '22px sans-serif';
                ctx.fillText('Điểm: ' + score + '  |  Kỷ Lục: ' + best, 200, 230);
                ctx.font = '16px sans-serif';
                ctx.fillText('Bấm để chơi lại lượt mới', 200, 280);
            }

            requestAnimationFrame(loop);
        }
        loop();
    </script>
</body>
</html>`
    },
    {
        id: "cyberpunk_snake",
        title: "Cyberpunk Neon Snake 3D",
        category: "game",
        icon: "🐍",
        badge: "Retro Cyberpunk",
        desc: "Rắn săn mồi phong cách neon phát sáng với hiệu ứng hạt đuôi, hệ thống level tăng tốc và âm thanh điện tử.",
        tags: ["Game", "Neon", "Cyberpunk", "Audio"],
        code: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Neon Snake</title>
    <style>
        body { margin:0; background:#090d16; color:#38bdf8; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; font-family:'Courier New', monospace; }
        canvas { background:#030712; border:2px solid #06b6d4; border-radius:12px; box-shadow:0 0 25px rgba(6,182,212,0.4); }
        .score-box { display:flex; gap:30px; font-size:1.2rem; font-weight:bold; margin-bottom:12px; letter-spacing:1px; }
        .keys { margin-top:12px; font-size:0.85rem; color:#64748b; }
    </style>
</head>
<body>
    <div class="score-box">
        <span>SCORE: <span id="sc" style="color:#22c55e;">0</span></span>
        <span>HIGH: <span id="hi" style="color:#f59e0b;">0</span></span>
    </div>
    <canvas id="c" width="440" height="440"></canvas>
    <div class="keys">Dùng phím Mũi Tên (Arrow Keys) hoặc W-A-S-D để điều khiển rắn!</div>
    <script>
        const c = document.getElementById('c'), ctx = c.getContext('2d');
        const GRID = 20, COUNT = 22;
        let snake = [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}];
        let dx = 1, dy = 0, food = {x: 15, y: 10}, score = 0, hi = 0, over = false;

        const aCtx = new (window.AudioContext || window.webkitAudioContext)();
        function beep(f, t=0.08) {
            try {
                const o = aCtx.createOscillator(), g = aCtx.createGain();
                o.frequency.value = f; o.connect(g); g.connect(aCtx.destination);
                g.gain.setValueAtTime(0.08, aCtx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, aCtx.currentTime + t);
                o.start(); o.stop(aCtx.currentTime + t);
            } catch(e){}
        }

        function spawnFood() {
            food = {
                x: Math.floor(Math.random() * COUNT),
                y: Math.floor(Math.random() * COUNT)
            };
        }

        window.addEventListener('keydown', e => {
            if (over) { reset(); return; }
            if ((e.key === 'ArrowUp' || e.key === 'w') && dy !== 1) { dx = 0; dy = -1; beep(300); }
            if ((e.key === 'ArrowDown' || e.key === 's') && dy !== -1) { dx = 0; dy = 1; beep(300); }
            if ((e.key === 'ArrowLeft' || e.key === 'a') && dx !== 1) { dx = -1; dy = 0; beep(300); }
            if ((e.key === 'ArrowRight' || e.key === 'd') && dx !== -1) { dx = 1; dy = 0; beep(300); }
        });

        function reset() {
            snake = [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}];
            dx = 1; dy = 0; score = 0; over = false; spawnFood();
            document.getElementById('sc').innerText = 0;
        }

        function update() {
            if (over) return;
            const head = { x: snake[0].x + dx, y: snake[0].y + dy };

            // Wrap or die
            if (head.x < 0 || head.x >= COUNT || head.y < 0 || head.y >= COUNT) {
                over = true; beep(120, 0.4); return;
            }
            for (let part of snake) {
                if (part.x === head.x && part.y === head.y) {
                    over = true; beep(120, 0.4); return;
                }
            }

            snake.unshift(head);
            if (head.x === food.x && head.y === food.y) {
                score += 10;
                if (score > hi) hi = score;
                document.getElementById('sc').innerText = score;
                document.getElementById('hi').innerText = hi;
                beep(650, 0.12);
                spawnFood();
            } else {
                snake.pop();
            }
        }

        function draw() {
            ctx.fillStyle = '#030712';
            ctx.fillRect(0, 0, 440, 440);

            // Grid lines
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1;
            for (let i = 0; i <= COUNT; i++) {
                ctx.beginPath(); ctx.moveTo(i*GRID, 0); ctx.lineTo(i*GRID, 440); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, i*GRID); ctx.lineTo(440, i*GRID); ctx.stroke();
            }

            // Food Glow
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ec4899';
            ctx.fillStyle = '#f43f5e';
            ctx.beginPath();
            ctx.arc(food.x * GRID + GRID/2, food.y * GRID + GRID/2, GRID/2 - 2, 0, Math.PI*2);
            ctx.fill();

            // Snake Glow
            snake.forEach((s, idx) => {
                ctx.shadowBlur = idx === 0 ? 18 : 8;
                ctx.shadowColor = idx === 0 ? '#06b6d4' : '#10b981';
                ctx.fillStyle = idx === 0 ? '#38bdf8' : '#10b981';
                ctx.fillRect(s.x * GRID + 1, s.y * GRID + 1, GRID - 2, GRID - 2);
            });
            ctx.shadowBlur = 0;

            if (over) {
                ctx.fillStyle = 'rgba(0,0,0,0.75)';
                ctx.fillRect(0, 0, 440, 440);
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 30px Courier New';
                ctx.textAlign = 'center';
                ctx.fillText('SYSTEM OVERHEAT', 220, 200);
                ctx.fillStyle = '#38bdf8';
                ctx.font = '16px Courier New';
                ctx.fillText('Bấm phím bất kỳ để Reboot', 220, 240);
            }
        }

        setInterval(() => { update(); draw(); }, 100);
    </script>
</body>
</html>`
    },
    {
        id: "space_shooter",
        title: "Bắn Ruồi Vũ Trụ (Space Defender)",
        category: "game",
        icon: "🚀",
        badge: "Arcade Shooter",
        desc: "Chiến hạm bắn phá thiên thạch và hạm đội ngoài hành tinh với hiệu ứng hạt nổ laser và âm thanh arcade sống động.",
        tags: ["Game", "Bắn ruồi", "Laser", "Particle"],
        code: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Space Galaxy Defender</title>
    <style>
        body { margin: 0; background: #030712; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; color: white; }
        canvas { border: 2px solid #6366f1; border-radius: 12px; box-shadow: 0 0 30px rgba(99,102,241,0.5); cursor: crosshair; }
        .info { margin-top: 10px; color: #94a3b8; font-size: 0.9rem; }
    </style>
</head>
<body>
    <canvas id="c" width="450" height="600"></canvas>
    <div class="info">Di chuyển chuột / cảm ứng để lái phi thuyền. Bấm phím SPACE hoặc Click để bắn!</div>
    <script>
        const c = document.getElementById('c'), ctx = c.getContext('2d');
        const aCtx = new (window.AudioContext || window.webkitAudioContext)();
        function sfx(f, dur=0.08, type='square') {
            try {
                const o = aCtx.createOscillator(), g = aCtx.createGain();
                o.type = type; o.frequency.value = f;
                g.gain.setValueAtTime(0.08, aCtx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, aCtx.currentTime + dur);
                o.connect(g); g.connect(aCtx.destination);
                o.start(); o.stop(aCtx.currentTime + dur);
            } catch(e){}
        }

        let player = { x: 225, y: 520, w: 32, h: 32 };
        let bullets = [], enemies = [], stars = [], particles = [], score = 0, hp = 100, over = false;

        for(let i=0; i<60; i++) stars.push({x: Math.random()*450, y: Math.random()*600, s: Math.random()*2+1});

        c.addEventListener('mousemove', e => {
            const rect = c.getBoundingClientRect();
            player.x = e.clientX - rect.left;
        });

        function shoot() {
            if (over) { reset(); return; }
            bullets.push({x: player.x, y: player.y - 10});
            sfx(880, 0.06);
        }
        window.addEventListener('keydown', e => { if (e.code === 'Space') shoot(); });
        c.addEventListener('pointerdown', shoot);

        function reset() {
            player.x = 225; bullets = []; enemies = []; particles = []; score = 0; hp = 100; over = false;
        }

        let frame = 0;
        function loop() {
            frame++;
            ctx.fillStyle = '#030712';
            ctx.fillRect(0, 0, 450, 600);

            // Stars
            ctx.fillStyle = '#ffffff';
            stars.forEach(s => {
                s.y += s.s; if (s.y > 600) s.y = 0;
                ctx.fillRect(s.x, s.y, s.s, s.s);
            });

            if (!over) {
                if (frame % 35 === 0) {
                    enemies.push({ x: Math.random()*400 + 25, y: -20, r: 14 + Math.random()*8, hp: 2 });
                }

                // Bullets
                bullets.forEach(b => b.y -= 7);
                bullets = bullets.filter(b => b.y > -10);

                // Enemies
                enemies.forEach(en => {
                    en.y += 2.2;
                    // Check hit player
                    const dist = Math.hypot(en.x - player.x, en.y - player.y);
                    if (dist < en.r + 15) {
                        hp -= 20; en.y = 700;
                        sfx(140, 0.2, 'sawtooth');
                        if (hp <= 0) over = true;
                    }
                });

                // Bullet hit enemy
                bullets.forEach(b => {
                    enemies.forEach(en => {
                        if (Math.hypot(b.x - en.x, b.y - en.y) < en.r + 6) {
                            en.hp--;
                            b.y = -100;
                            if (en.hp <= 0) {
                                en.y = 700; score += 20;
                                sfx(320, 0.15, 'triangle');
                                for(let i=0; i<12; i++) {
                                    particles.push({x: en.x, y: en.y, vx: (Math.random()-0.5)*6, vy: (Math.random()-0.5)*6, life: 25});
                                }
                            }
                        }
                    });
                });
                enemies = enemies.filter(en => en.y < 650);
            }

            // Particles
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy; p.life--;
                ctx.fillStyle = '#f59e0b';
                ctx.fillRect(p.x, p.y, 3, 3);
            });
            particles = particles.filter(p => p.life > 0);

            // Draw Bullets
            ctx.fillStyle = '#06b6d4';
            ctx.shadowBlur = 10; ctx.shadowColor = '#06b6d4';
            bullets.forEach(b => ctx.fillRect(b.x - 2, b.y, 4, 12));

            // Draw Enemies
            enemies.forEach(en => {
                ctx.shadowColor = '#ef4444';
                ctx.fillStyle = '#dc2626';
                ctx.beginPath(); ctx.arc(en.x, en.y, en.r, 0, Math.PI*2); ctx.fill();
            });

            // Draw Player Ship
            ctx.shadowColor = '#818cf8';
            ctx.fillStyle = '#6366f1';
            ctx.beginPath();
            ctx.moveTo(player.x, player.y - 18);
            ctx.lineTo(player.x - 16, player.y + 14);
            ctx.lineTo(player.x + 16, player.y + 14);
            ctx.closePath(); ctx.fill();
            ctx.shadowBlur = 0;

            // HUD
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('SCORE: ' + score, 16, 28);
            ctx.fillText('HP: ' + hp + '%', 370, 28);

            if (over) {
                ctx.fillStyle = 'rgba(0,0,0,0.8)';
                ctx.fillRect(0, 0, 450, 600);
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 32px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('GAME OVER', 225, 270);
                ctx.fillStyle = '#38bdf8';
                ctx.font = '18px sans-serif';
                ctx.fillText('Bấm chuột để tái chiến', 225, 315);
            }

            requestAnimationFrame(loop);
        }
        loop();
    </script>
</body>
</html>`
    },
    {
        id: "particle_wave_3d",
        title: "Bão Hạt Vũ Trụ 3D (Particle Motion Video)",
        category: "video",
        icon: "🌌",
        badge: "Visual / Video Animation",
        desc: "Hoạt họa bão hạt 3D cực mượt phản hồi theo chuột, dùng làm hình nền động, visualizer âm nhạc hoặc xuất hiệu ứng video.",
        tags: ["Canvas", "3D", "Video Animation", "Hiệu ứng"],
        code: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>3D Cosmic Particle Storm</title>
    <style>
        body { margin: 0; background: #000; overflow: hidden; }
        canvas { display: block; }
        .hud { position: absolute; top: 16px; left: 16px; color: #a5b4fc; font-family: sans-serif; font-size: 0.9rem; pointer-events: none; }
    </style>
</head>
<body>
    <div class="hud">🌌 <strong>Cosmic Particle Storm 3D</strong> | Rê chuột để xoay trường hấp dẫn</div>
    <canvas id="c"></canvas>
    <script>
        const c = document.getElementById('c'), ctx = c.getContext('2d');
        let w = c.width = window.innerWidth, h = c.height = window.innerHeight;
        window.addEventListener('resize', () => { w = c.width = window.innerWidth; h = c.height = window.innerHeight; });

        const NUM = 450;
        let particles = [];
        let mx = w/2, my = h/2;
        window.addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; });

        for(let i=0; i<NUM; i++) {
            particles.push({
                x: (Math.random() - 0.5) * w * 1.5,
                y: (Math.random() - 0.5) * h * 1.5,
                z: Math.random() * 1000 + 1,
                color: 'hsl(' + (Math.random()*60 + 200) + ', 100%, 65%)'
            });
        }

        function loop() {
            ctx.fillStyle = 'rgba(2, 6, 23, 0.2)';
            ctx.fillRect(0, 0, w, h);

            const cx = w / 2, cy = h / 2;
            const rotX = (my - cy) * 0.0005;
            const rotY = (mx - cx) * 0.0005;

            particles.forEach(p => {
                p.z -= 4;
                if (p.z <= 10) { p.z = 1000; p.x = (Math.random() - 0.5) * w; p.y = (Math.random() - 0.5) * h; }

                // 3D projection
                const fov = 400;
                const scale = fov / (fov + p.z);
                const x2d = p.x * scale + cx;
                const y2d = p.y * scale + cy;

                const size = Math.max(1, (1 - p.z / 1000) * 4.5);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(x2d, y2d, size, 0, Math.PI*2);
                ctx.fill();
            });

            requestAnimationFrame(loop);
        }
        loop();
    </script>
</body>
</html>`
    },
    {
        id: "pomodoro_timer",
        title: "Đồng Hồ Pomodoro & Lofi Focus",
        category: "app",
        icon: "⏳",
        badge: "Năng Suất",
        desc: "Đồng hồ quản lý thời gian làm việc chuẩn 25/5 với âm thanh chuông ngân thư thái và danh sách công việc kéo thả.",
        tags: ["Pomodoro", "Năng suất", "Âm thanh", "Thời gian"],
        code: `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Pomodoro Focus</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; background: linear-gradient(135deg, #0f172a, #1e1b4b); color: #f8fafc; font-family: 'Plus Jakarta Sans', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; }
        .card { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); padding: 36px; border-radius: 24px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.4); width: 340px; }
        .timer { font-size: 4.5rem; font-weight: 800; letter-spacing: 2px; color: #38bdf8; margin: 20px 0; }
        .btns { display: flex; gap: 12px; justify-content: center; }
        button { background: #38bdf8; color: #0f172a; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        button:hover { transform: scale(1.05); background: #7dd3fc; }
        .btn-reset { background: #334155; color: #94a3b8; }
    </style>
</head>
<body>
    <div class="card">
        <h2 style="margin:0;font-size:1.3rem;color:#94a3b8;">🎯 PHIÊN TẬP TRUNG</h2>
        <div class="timer" id="t">25:00</div>
        <div class="btns">
            <button id="btn-start" onclick="toggle()">Bắt đầu</button>
            <button class="btn-reset" onclick="reset()">Đặt lại</button>
        </div>
    </div>
    <script>
        let sec = 25 * 60, run = false, timer = null;
        function toggle() {
            run = !run;
            document.getElementById('btn-start').innerText = run ? 'Tạm dừng' : 'Tiếp tục';
            if (run) {
                timer = setInterval(() => {
                    if (sec > 0) { sec--; updateDisplay(); }
                    else { clearInterval(timer); alert('Đã hết giờ! Hãy nghỉ ngơi 5 phút nhé!'); }
                }, 1000);
            } else { clearInterval(timer); }
        }
        function reset() {
            clearInterval(timer); run = false; sec = 25 * 60;
            document.getElementById('btn-start').innerText = 'Bắt đầu';
            updateDisplay();
        }
        function updateDisplay() {
            const m = Math.floor(sec / 60).toString().padStart(2, '0');
            const s = (sec % 60).toString().padStart(2, '0');
            document.getElementById('t').innerText = m + ':' + s;
        }
    </script>
</body>
</html>`
    }
];

window.openVibeCodingModal = function() {
    let modal = document.getElementById("modal-vibe-coding");
    if (!modal) {
        console.error("Không tìm thấy modal-vibe-coding");
        return;
    }
    renderVibeTemplateCards();
    modal.style.display = "flex";
};

function renderVibeTemplateCards(category = "all") {
    const grid = document.getElementById("vibe-templates-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const list = category === "all" 
        ? window.VIBE_TEMPLATES 
        : window.VIBE_TEMPLATES.filter(t => t.category === category);

    list.forEach(t => {
        const card = document.createElement("div");
        card.className = "vibe-card";
        card.innerHTML = `
            <div class="vibe-card-header">
                <span class="vibe-card-icon">${t.icon}</span>
                <span class="vibe-card-badge">${t.badge}</span>
            </div>
            <div class="vibe-card-title">${t.title}</div>
            <div class="vibe-card-desc">${t.desc}</div>
            <div class="vibe-card-tags">
                ${t.tags.map(tag => `<span class="vibe-tag">#${tag}</span>`).join("")}
            </div>
            <div class="vibe-card-actions">
                <button class="btn-run-vibe" onclick="window.loadVibeTemplate('${t.id}')">
                    🚀 Chạy Thử Ngay
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

window.loadVibeTemplate = function(templateId) {
    const t = window.VIBE_TEMPLATES.find(x => x.id === templateId);
    if (!t) return;

    closeModal("modal-vibe-coding");
    if (typeof switchViewMode === "function") switchViewMode("ide");
    if (typeof switchIdeEditorTab === "function") switchIdeEditorTab("preview");

    const frame = document.getElementById("ide-preview-frame");
    const title = document.getElementById("ide-preview-title");
    if (title) title.textContent = "✨ " + t.title + " (Live Vibe Runner)";

    if (frame) {
        frame.removeAttribute("src");
        frame.srcdoc = t.code;
    }

    if (typeof setIdeCode === "function") {
        setIdeCode(t.code, "htmlmixed");
    }

    const tabName = document.getElementById("ide-tab-name");
    if (tabName) tabName.textContent = t.id + ".html";

    const btnPrev = document.getElementById("ide-mode-preview");
    if (btnPrev) btnPrev.style.display = "inline-block";

    if (typeof showToast === "function") {
        showToast("✨ Đã tải mẫu Vibe: " + t.title);
    }
};

window.startVibeFromInput = function() {
    const input = document.getElementById("vibe-custom-prompt");
    if (!input) return;
    const val = input.value.trim();
    if (!val) {
        alert("Vui lòng nhập ý tưởng ứng dụng hoặc game bạn muốn tạo!");
        return;
    }

    closeModal("modal-vibe-coding");
    const mainInput = document.getElementById("main-user-input");
    if (mainInput) {
        mainInput.value = "/vibe " + val;
        mainInput.focus();
        const sendBtn = document.getElementById("btn-send-message");
        if (sendBtn) sendBtn.click();
    }
};
