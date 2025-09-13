// Simple seat booking test
// Run in browser console after setting up auth

console.log('🎭 Testing Seat Booking...');

// Test 1: Check if user is authenticated
const token = localStorage.getItem('token');
const user = localStorage.getItem('user');
console.log('Auth check:', { hasToken: !!token, hasUser: !!user });

// Test 2: Navigate to seat booking event
const seatEventUrl = 'http://localhost:3001/events/cmfhy33ti0003nvc3jg1163zx';
console.log('Navigate to:', seatEventUrl);

// Test 3: Instructions for manual testing
console.log(`
🧪 Manual Test Steps:
1. Ensure you're on the Theater Show event page
2. Look for seat selection interface
3. Click on a few seats to select them
4. Scroll down and click "Book X Selected Seat(s)"
5. Expect: Loading button → Congratulations popup (no toast messages)

🔍 What to watch for:
• No "Processing seat booking" toast
• No "Successfully booked" toast  
• Clean loading spinner on button
• Direct transition to congratulations popup
• Seats reset after booking
`);

