# Disk Analyzer Tool

Công cụ tự động quét dung lượng file trong workspace.

## Cách sử dụng:
1. Mở terminal tại thư mục `disk_analyzer`.
2. Chạy lệnh: `python analyzer.py`.
3. Kết quả sẽ được xuất ra file `bao_cao_dung_luong.txt` tại thư mục gốc `H:\KINI_AI\workspace\`.

## Cấu hình:
- Mở file `analyzer.py` bằng trình soạn thảo code.
- Thay đổi giá trị `threshold_mb` trong hàm `scan_workspace` để lọc file theo kích thước mong muốn (mặc định là 10MB).