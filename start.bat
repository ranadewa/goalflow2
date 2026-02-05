@echo off
echo ================================
echo   GoalFlow - Phase 1 Setup
echo ================================
echo.

if not exist ".env" (
    echo Creating .env from template...
    copy .env.example .env
    echo.
    echo *** EDIT .env WITH YOUR SUPABASE CREDENTIALS ***
    echo.
    pause
)

echo Installing dependencies...
call npm install

echo.
echo Starting dev server...
echo Open http://localhost:5173
echo.
call npm run dev
