@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (py -3 build_offline.py) else (python build_offline.py)
pause
