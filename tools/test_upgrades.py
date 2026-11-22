import requests
import json

print("=== BẮT ĐẦU KIỂM THỬ 4 NÂNG CẤP & CẤU HÌNH KINI AI ===")

# 1. Test Python Code Interpreter
code_to_test = """
import math
radius = 5
area = math.pi * (radius ** 2)
print("Bán kính hình tròn:", radius)
print("Diện tích tính toán được:", round(area, 2))
"""
res_code = requests.post("http://127.0.0.1:8000/api/code/run", json={"code": code_to_test})
print(f"1. Test Code Interpreter: Status {res_code.status_code}")
if res_code.status_code == 200:
    data = res_code.json()
    print(f"   Success: {data.get('success')}")
    print(f"   Output:\n{data.get('stdout')}")
    print(f"   Elapsed: {data.get('elapsed')}s")

# 2. Test Antigravity Studio File Reader (snake_game/main.py)
res_file = requests.get("http://127.0.0.1:8000/api/agent/file?path=snake_game/main.py")
print(f"2. Test Studio File Reader: Status {res_file.status_code}")
if res_file.status_code == 200:
    print(f"   File length: {len(res_file.json().get('content', ''))} bytes")

# 3. Test Deep Research endpoint
print("3. Test Deep Research Endpoint:")
res_res = requests.post("http://127.0.0.1:8000/api/research/deep", json={
    "topic": "Xu hướng trí tuệ nhân tạo cá nhân hóa năm 2026",
    "conv_id": "test_deep_research"
})
print(f"   Deep Research Status: {res_res.status_code}")
if res_res.status_code == 200:
    rep = res_res.json()
    print(f"   Report length: {len(rep.get('reply', ''))} ký tự")
    print(f"   Sources investigated: {rep.get('sources_count')}")

# 4. Test Public Cloudflare Tunnel
try:
    res_tunnel = requests.get("https://broadway-endif-sell-street.trycloudflare.com", timeout=6)
    print(f"4. Test Public Cloudflare Tunnel: Status {res_tunnel.status_code}")
except Exception as e:
    print(f"4. Test Tunnel Error: {e}")

print("=== HOÀN TẤT KIỂM THỬ ===")
