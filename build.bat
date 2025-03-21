@echo off
echo Building Course Management System...

REM Activate virtual environment if you're using one
REM call venv\Scripts\activate

REM Install requirements
pip install -r requirements.txt

REM Run the build script
python build.py

echo Build process completed!
pause 