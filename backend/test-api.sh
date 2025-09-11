#!/bin/bash

# API Test Script for Evently Backend
echo "🧪 EVENTLY API TESTING SUITE"
echo "=============================="

BASE_URL="http://localhost:4000"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "\n${YELLOW}Testing: ${description}${NC}"
    echo "Endpoint: ${method} ${BASE_URL}${endpoint}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X "${method}" "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "${data}")
    fi
    
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✅ SUCCESS (${http_code})${NC}"
    elif [ "$http_code" -ge 400 ] && [ "$http_code" -lt 500 ]; then
        echo -e "${YELLOW}⚠️  CLIENT ERROR (${http_code})${NC}"
    else
        echo -e "${RED}❌ FAILED (${http_code})${NC}"
    fi
    
    echo "Response: ${body}" | head -c 200
    echo "..."
}

echo -e "\n1️⃣ Testing Health Endpoints..."
test_endpoint "GET" "/health" "" "Server health check"
test_endpoint "GET" "/api/test" "" "API connectivity test"

echo -e "\n2️⃣ Testing Authentication Endpoints..."
test_endpoint "POST" "/api/auth/register" '{"email":"test@example.com","password":"password123","name":"Test User"}' "User registration"
test_endpoint "POST" "/api/auth/login" '{"email":"test@example.com","password":"password123"}' "User login"

echo -e "\n3️⃣ Testing Events Endpoints..."
test_endpoint "GET" "/api/events" "" "Get all events"
test_endpoint "GET" "/api/events/123" "" "Get specific event"

echo -e "\n4️⃣ Testing Waitlist Endpoints..."
test_endpoint "GET" "/api/waitlist/event/123" "" "Get event waitlist"
test_endpoint "POST" "/api/waitlist" '{"eventId":"test-event","userId":"test-user"}' "Join waitlist"

echo -e "\n5️⃣ Testing Admin Endpoints (will require auth)..."
test_endpoint "GET" "/api/admin/dashboard/overview" "" "Admin analytics overview"
test_endpoint "GET" "/api/admin/queues" "" "Job queue status"

echo -e "\n6️⃣ Testing Error Handling..."
test_endpoint "GET" "/api/nonexistent" "" "404 error handling"
test_endpoint "POST" "/api/auth/login" '{"invalid":"json"}' "Invalid request handling"

echo -e "\n=============================="
echo "🏁 API Testing Complete!"
echo "Check the responses above to verify your endpoints are working correctly."
