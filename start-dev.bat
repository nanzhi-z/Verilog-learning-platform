@echo off
rem Learn Verilog - 一键启动开发服务器并打开浏览器
rem 双击运行；关闭本窗口即停止服务器
cd /d "%~dp0"

rem 3 秒后自动打开浏览器（等服务器就绪）
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:5173/"

echo [Learn Verilog] dev server starting at http://localhost:5173/
call npm run dev
pause
