import random
import time

def roll_dice():
    print("\n--- ĐANG TUNG XÚC XẮC ---")
    time.sleep(1)
    result = random.randint(1, 6)
    print(f"Kết quả: {result} điểm!")
    return result

def main():
    print("Chào mừng anh Trường đến với Game Xúc Xắc Mini!")
    while True:
        choice = input("\nNhấn 'Enter' để tung xúc xắc hoặc 'q' để thoát: ").lower()
        if choice == 'q':
            print("Cảm ơn anh đã chơi. Hẹn gặp lại!")
            break
        roll_dice()

if __name__ == '__main__':
    main()