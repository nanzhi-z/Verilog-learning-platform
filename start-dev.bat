@echo off
rem Learn Verilog - 一键启动开发服务器并打开浏览器
rem 双击运行；关闭本窗口即停止服务器
cd /d "%~dp0"

rem 后台等待服务器真正就绪（HTTP 200）后再打开浏览器——轮询，不依赖固定延时
start "" /min powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0wait-and-open.ps1" -Url "http://localhost:5173/"

echo [Learn Verilog] dev server starting at http://localhost:5173/
echo.
call npm run dev
pause
