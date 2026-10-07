#!/bin/bash
# Ravens Season Sim — serves web/ on port 4265. Usage: nohup ./run.sh > server.log 2>&1 &
cd "$(dirname "$0")"
exec python3 server.py
