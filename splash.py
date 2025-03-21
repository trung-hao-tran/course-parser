import tkinter as tk
from tkinter import ttk
import os
import sys

class SplashScreen:
    def __init__(self):
        self.root = tk.Tk()
        self.root.overrideredirect(True)
        
        # Get screen dimensions
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        
        # Calculate position
        width = 400
        height = 200
        x = (screen_width - width) // 2
        y = (screen_height - height) // 2
        
        self.root.geometry(f'{width}x{height}+{x}+{y}')
        
        # Create frame
        frame = ttk.Frame(self.root)
        frame.pack(fill='both', expand=True)
        
        # Add logo if exists
        if getattr(sys, 'frozen', False):
            logo_path = os.path.join(os.path.dirname(sys.executable), 'static', 'logo.png')
        else:
            logo_path = os.path.join('static', 'logo.png')
            
        if os.path.exists(logo_path):
            logo = tk.PhotoImage(file=logo_path)
            logo_label = ttk.Label(frame, image=logo)
            logo_label.image = logo
            logo_label.pack(pady=20)
        
        # Add loading text
        ttk.Label(frame, text="Loading Course Management System...").pack(pady=10)
        
        # Add progress bar
        self.progress = ttk.Progressbar(frame, length=300, mode='indeterminate')
        self.progress.pack(pady=20)
        self.progress.start()
        
        self.root.update()
    
    def destroy(self):
        self.root.destroy() 