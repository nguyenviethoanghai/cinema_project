#!/bin/bash

echo "Starting Unit Tests for all services..."

# 1. Analytics Service
echo "--------------------------------------"
echo "Running Tests for Analytics Service..."
cd analytics-service && npm test && cd ..

# 2. User Service
echo "--------------------------------------"
echo "Running Tests for User Service..."
cd user-service && npm test && cd ..

# 3. Chatbot Service
echo "--------------------------------------"
echo "Running Tests for Chatbot Service..."
cd chatbot && npm test && cd ..

# 4. API Gateway (Go)
echo "--------------------------------------"
echo "Running Tests for API Gateway (Go)..."
if command -v go &> /dev/null
then
    cd api-gateway && go test -v ./internal/middleware && cd ..
else
    echo "Go is not installed. Skipping Go tests."
fi

# 5. Movie Service (Go)
echo "--------------------------------------"
echo "Running Tests for Movie Service (Go)..."
if command -v go &> /dev/null
then
    cd movie-service && go test -v ./internal/module/news && cd ..
else
    echo "Go is not installed. Skipping Go tests."
fi

echo "--------------------------------------"
echo "All Unit Tests completed!"
