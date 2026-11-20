import tkinter as tk
import random

class SnakeGame:
    def __init__(self, root):
        self.root = root
        self.root.title("Rắn Săn Mồi - KINI AI Agent (Zero-Install)")
        self.root.resizable(False, False)
        
        self.width = 600
        self.height = 400
        self.grid_size = 20
        self.speed = 100 # ms
        
        self.canvas = tk.Canvas(root, width=self.width, height=self.height, bg="#0d0e15", highlightthickness=0)
        self.canvas.pack()
        
        self.score_label = tk.Label(root, text="Điểm số: 0", font=("Arial", 14, "bold"), fg="#00f2fe", bg="#0d0e15")
        self.score_label.pack(fill="x")
        
        self.direction = "Right"
        self.next_direction = "Right"
        self.snake = [(100, 100), (80, 100), (60, 100)]
        self.food = None
        self.score = 0
        self.game_over = False
        
        self.root.bind("<KeyPress>", self.on_key)
        self.spawn_food()
        self.update()

    def spawn_food(self):
        while True:
            x = random.randint(0, (self.width - self.grid_size) // self.grid_size) * self.grid_size
            y = random.randint(0, (self.height - self.grid_size) // self.grid_size) * self.grid_size
            if (x, y) not in self.snake:
                self.food = (x, y)
                break

    def on_key(self, event):
        key = event.keysym
        opposites = {"Up": "Down", "Down": "Up", "Left": "Right", "Right": "Left"}
        if key in ["Up", "Down", "Left", "Right"] and opposites.get(key) != self.direction:
            self.next_direction = key
        elif key.lower() in ["c", "r"] and self.game_over:
            self.restart()

    def restart(self):
        self.direction = "Right"
        self.next_direction = "Right"
        self.snake = [(100, 100), (80, 100), (60, 100)]
        self.score = 0
        self.score_label.config(text="Điểm số: 0")
        self.game_over = False
        self.spawn_food()
        self.update()

    def update(self):
        if self.game_over:
            return

        self.direction = self.next_direction
        head_x, head_y = self.snake[0]
        
        if self.direction == "Up": head_y -= self.grid_size
        elif self.direction == "Down": head_y += self.grid_size
        elif self.direction == "Left": head_x -= self.grid_size
        elif self.direction == "Right": head_x += self.grid_size

        # Va chạm tường
        if head_x < 0 or head_x >= self.width or head_y < 0 or head_y >= self.height:
            self.end_game()
            return

        # Tự cắn đuôi
        if (head_x, head_y) in self.snake:
            self.end_game()
            return

        new_head = (head_x, head_y)
        self.snake.insert(0, new_head)

        # Ăn thức ăn
        if new_head == self.food:
            self.score += 10
            self.score_label.config(text=f"Điểm số: {self.score}")
            self.spawn_food()
        else:
            self.snake.pop()

        self.draw()
        self.root.after(self.speed, self.update)

    def draw(self):
        self.canvas.delete("all")
        
        # Vẽ viền không gian
        self.canvas.create_rectangle(2, 2, self.width-2, self.height-2, outline="#00f2fe", width=2)
        
        # Vẽ mồi
        fx, fy = self.food
        self.canvas.create_oval(fx+2, fy+2, fx+self.grid_size-2, fy+self.grid_size-2, fill="#ff007f", outline="#ffb703", width=2)

        # Vẽ rắn
        for i, (sx, sy) in enumerate(self.snake):
            color = "#00f2fe" if i == 0 else "#9d4edd"
            self.canvas.create_rectangle(sx+1, sy+1, sx+self.grid_size-1, sy+self.grid_size-1, fill=color, outline="#ffffff")

    def end_game(self):
        self.game_over = True
        self.canvas.create_rectangle(50, 120, 550, 280, fill="#121420", outline="#ff007f", width=2)
        self.canvas.create_text(self.width//2, 170, text="GAME OVER!", fill="#ff0055", font=("Arial", 22, "bold"))
        self.canvas.create_text(self.width//2, 210, text=f"Điểm số của anh: {self.score}", fill="#ffffff", font=("Arial", 14))
        self.canvas.create_text(self.width//2, 245, text="Nhấn phím [R] hoặc [C] để Chơi Lại", fill="#00f2fe", font=("Arial", 12))

if __name__ == "__main__":
    root = tk.Tk()
    game = SnakeGame(root)
    root.mainloop()
