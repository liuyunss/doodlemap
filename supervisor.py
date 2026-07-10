#!/usr/bin/env python3
"""
DoodleMap Supervisor — keeps the server running, restarts on crash.
Equivalent to systemd Restart=always behavior.
"""
import os
import subprocess
import sys
import time
import signal

SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'server.py')
PYTHON = sys.executable
RESTART_DELAY = 3
MAX_RESTARTS = 10
restart_count = 0

def start_server():
    """Start the HTTP server as a subprocess."""
    env = os.environ.copy()
    env['DOODLEMAP_PORT'] = env.get('DOODLEMAP_PORT', '9120')
    
    proc = subprocess.Popen(
        [PYTHON, SCRIPT],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        env=env,
    )
    print(f"[Supervisor] Started server PID={proc.pid}")
    return proc

def main():
    global restart_count
    
    def handle_signal(signum, frame):
        print(f"[Supervisor] Received signal {signum}, exiting...")
        if 'proc' in globals():
            proc.terminate()
            proc.wait(timeout=5)
        sys.exit(0)
    
    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)
    
    while True:
        proc = start_server()
        
        # Stream output
        for line in proc.stdout:
            sys.stdout.write(line)
            sys.stdout.flush()
        
        retcode = proc.wait()
        print(f"[Supervisor] Server exited with code {retcode}")
        
        restart_count += 1
        if restart_count > MAX_RESTARTS:
            print(f"[Supervisor] Max restarts ({MAX_RESTARTS}) exceeded, giving up")
            sys.exit(1)
        
        print(f"[Supervisor] Restarting in {RESTART_DELAY}s... (attempt {restart_count})")
        time.sleep(RESTART_DELAY)

if __name__ == '__main__':
    main()
