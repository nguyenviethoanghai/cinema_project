@echo off
echo Starting Unit Tests for all services...

:: 1. Analytics Service
echo --------------------------------------
echo Running Tests for Analytics Service...
cd analytics-service
call npm test
cd ..

:: 2. User Service
echo --------------------------------------
echo Running Tests for User Service...
cd user-service
call npm test
cd ..

:: 3. Chatbot Service
echo --------------------------------------
echo Running Tests for Chatbot Service...
cd chatbot
call npm test
cd ..

:: 4. Go Tests (Check if Go exists)
where go >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo --------------------------------------
    echo Running Tests for API Gateway (Go)...
    cd api-gateway
    go test -v ./internal/middleware
    cd ..

    echo --------------------------------------
    echo Running Tests for Movie Service (Go)...
    cd movie-service
    go test -v ./internal/module/news
    cd ..
) else (
    echo --------------------------------------
    echo Go is not installed. Skipping Go tests.
)

echo --------------------------------------
echo All Unit Tests completed!
pause
