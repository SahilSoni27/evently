// Debug seat booking flow
// Copy and paste this in browser console for testing

console.log('🎭 SEAT BOOKING DEBUG');
console.log('===================');

// Step 1: Check authentication
const token = localStorage.getItem('token');
const user = localStorage.getItem('user');

if (!token || !user) {
  console.log('❌ Not authenticated. Setting up test auth...');
  localStorage.setItem('token', 'test-token-123');
  localStorage.setItem('user', JSON.stringify({
    id: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'USER',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01'
  }));
  console.log('✅ Test auth set up. Please refresh the page.');
} else {
  console.log('✅ Already authenticated:', JSON.parse(user).name);
}

// Step 2: Monitor booking state
console.log('📊 Monitoring booking state changes...');

// Override console.log to catch our debug messages
const originalLog = console.log;
console.log = function(...args) {
  if (args[0] && typeof args[0] === 'string') {
    if (args[0].includes('Mock') || args[0].includes('booking') || args[0].includes('Seat')) {
      originalLog('🔍 [BOOKING DEBUG]', ...args);
    }
  }
  originalLog(...args);
};

console.log('✅ Debug monitoring active');
console.log('🎯 Now try booking seats and watch the console for debug info');

// Step 3: Instructions
console.log(`
📋 TEST CHECKLIST:
☐ Navigate to Theater Show event
☐ See seat selection interface  
☐ Select 1-3 seats
☐ Click "Book X Selected Seat(s)" button
☐ Button shows loading spinner
☐ After ~2 seconds, congratulations popup appears
☐ NO toast messages appear during process
☐ Seats reset and event data refreshes

🚨 If booking doesn't work:
• Check network tab for API errors
• Look for console error messages
• Verify seats are actually selected
• Make sure you're authenticated
`);
