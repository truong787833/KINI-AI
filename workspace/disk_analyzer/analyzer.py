import os

def get_size_format(b, factor=1024, suffix="B"):
    for unit in ["", "K", "M", "G", "T"]:
        if b < factor:
            return f"{b:.2f}{unit}{suffix}"
        b /= factor
    return f"{b:.2f}P{suffix}"

def scan_workspace(root_path, threshold_mb=10):
    report = []
    threshold_bytes = threshold_mb * 1024 * 1024
    
    report.append(f"--- BÁO CÁO DUNG LƯỢNG FILE LỚN HƠN {threshold_mb}MB ---")
    report.append(f"Quét tại: {root_path}\n")
    
    for root, dirs, files in os.walk(root_path):
        for name in files:
            filepath = os.path.join(root, name)
            try:
                size = os.path.getsize(filepath)
                if size > threshold_bytes:
                    report.append(f"{get_size_format(size)} | {filepath}")
            except Exception as e:
                continue
    
    return "\n".join(report)

if __name__ == "__main__":
    workspace = r"H:\KINI_AI\workspace"
    output_file = "bao_cao_dung_luong.txt"
    
    print(f"Đang quét thư mục: {workspace}...")
    result = scan_workspace(workspace)
    
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(result)
    
    print(f"Hoàn tất! Báo cáo đã được lưu tại: {os.path.abspath(output_file)}")