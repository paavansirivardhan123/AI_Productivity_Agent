import subprocess
import sys
import os
import time

def print_banner():
    # Green text ANSI codes
    green = "\033[92m"
    reset = "\033[0m"
    
    banner = f"""{green}
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🚀 AI PRODUCTIVITY AGENT IS RUNNING 🚀                    ║
║                                                              ║
║   💻 Frontend:   http://localhost:3000                       ║
║   ⚙️  Backend:    http://127.0.0.1:5000                      ║
║                                                              ║
║   [Press Ctrl+C to terminate both servers safely]            ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝{reset}
"""
    print(banner)

def main():
    # Workaround to enable ANSI colors in Windows terminal
    if os.name == 'nt':
        os.system('color')

    print_banner()

    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, "Backend")
    frontend_dir = os.path.join(base_dir, "frontend")

    # Start Backend using uv
    print(f"\033[92m[System] Starting Backend Service...\033[0m")
    backend_process = subprocess.Popen(
        ["uv", "run", "python", "server.py"],
        cwd=backend_dir,
        shell=True
    )

    # Start Frontend using npm
    print(f"\033[92m[System] Starting Frontend Service...\033[0m")
    frontend_process = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=frontend_dir,
        shell=True
    )

    try:
        # Keep the script alive while child processes run
        while True:
            time.sleep(1)
            # If either process crashed, exit out of this loop
            if backend_process.poll() is not None or frontend_process.poll() is not None:
                break
    except KeyboardInterrupt:
        pass # Handle Ctrl+C gracefully
    finally:
        print(f"\n\033[93m[System] Shutting down services...\033[0m")
        # Ensure child processes are killed properly on Windows
        if os.name == 'nt':
            subprocess.call(['taskkill', '/F', '/T', '/PID', str(backend_process.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            subprocess.call(['taskkill', '/F', '/T', '/PID', str(frontend_process.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            backend_process.terminate()
            frontend_process.terminate()
        
        print(f"\033[92m[System] Services stopped successfully.\033[0m")
        sys.exit(0)

if __name__ == "__main__":
    main()
