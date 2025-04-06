@echo off
echo Building Course Management System...

cd /d "%~dp0"
call venv\Scripts\activate.bat

echo Cleaning previous build files...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist

echo Running PyInstaller...
pyinstaller --noconfirm --clean ^
  --onedir ^
  --windowed ^
  --name "CourseManagementSystem" ^
  --add-data "templates;templates" ^
  --add-data "static;static" ^
  --add-data "routes;routes" ^
  --add-data "utils;utils" ^
  --hidden-import flask ^
  --hidden-import flask_cors ^
  --hidden-import flaskwebgui ^
  app.py

echo Copying additional files...
if exist "dist\CourseManagementSystem" (
  if exist courses.db copy /y courses.db "dist\CourseManagementSystem\"
  if exist requirements.txt copy /y requirements.txt "dist\CourseManagementSystem\"
)

echo Build completed!
pause 