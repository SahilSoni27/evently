#!/bin/bash

echo "🎭 Testing Seat Booking Flow"
echo "============================"

# Check if servers are running
echo "1. Checking servers..."
frontend_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001)
backend_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/events)

if [ "$frontend_status" = "200" ]; then
    echo "✅ Frontend running on http://localhost:3001"
else
    echo "❌ Frontend not accessible"
    exit 1
fi

if [ "$backend_status" = "200" ]; then
    echo "✅ Backend running on http://localhost:4000"
else
    echo "⚠️  Backend issues, but fallback will handle it"
fi

# Get seat-level booking events
echo ""
echo "2. Finding seat-level booking events..."
seat_events=$(curl -s http://localhost:4000/api/events | jq -r '.data.events[] | select(.seatLevelBooking == true) | "\(.name) - \(.id)"' | head -2)

if [ ! -z "$seat_events" ]; then
    echo "✅ Available seat-level booking events:"
    echo "$seat_events"
else
    echo "❌ No seat-level booking events found"
    exit 1
fi

echo ""
echo "🧪 SEAT BOOKING TEST INSTRUCTIONS"
echo "================================="

echo ""
echo "🎯 Step 1: Setup Authentication"
echo "------------------------------"
echo "Open http://localhost:3001/events in your browser"
echo "Open browser console (F12) and run:"
echo ""
echo "localStorage.setItem('token', 'test-token-123');"
echo "localStorage.setItem('user', JSON.stringify({"
echo "  id: 'test-user-123',"
echo "  name: 'Test User',"
echo "  email: 'test@example.com',"
echo "  role: 'USER',"
echo "  createdAt: '2025-01-01',"
echo "  updatedAt: '2025-01-01'"
echo "}));"
echo ""
echo "Then refresh the page."

echo ""
echo "🎯 Step 2: Test Seat Booking"
echo "---------------------------"
echo "1. Click on 'Theater Show - BookMyShow Style' (seat-level booking event)"
echo "2. You should see a seat selection interface"
echo "3. Select 1-3 seats by clicking on them"
echo "4. Scroll down to see the order summary with selected seats"
echo "5. Click 'Book X Selected Seat(s)' button"

echo ""
echo "🎯 Expected Flow:"
echo "=================="
echo "✅ Button shows 'Processing...' with loading spinner"
echo "✅ After 2 seconds, congratulations popup appears"
echo "✅ NO intermediate toast messages ('Processing seat booking', etc.)"
echo "✅ Seat selection resets after successful booking"
echo "✅ Event data refreshes to show updated capacity"

echo ""
echo "🔍 Debugging Tips:"
echo "=================="
echo "• Check browser console for any errors"
echo "• Booking API calls and responses will be logged"
echo "• If seats don't load, the backend might need authentication setup"
echo "• The fallback system will handle backend issues gracefully"

echo ""
echo "📝 Recent Fixes Applied:"
echo "======================="
echo "✅ Removed all toast messages from seat booking"
echo "✅ Added fallback for direct booking success"
echo "✅ Enhanced error handling for seat APIs"
echo "✅ Improved success detection logic"
echo "✅ Clean loading state management"

echo ""
echo "🚀 Test the flow now and report any issues!"
