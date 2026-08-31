@echo off
set NODE_OPTIONS=--use-system-ca
cd /d E:\ai-supermarket
node_modules\.bin\next.cmd dev --webpack -p 3000 -H 127.0.0.1
