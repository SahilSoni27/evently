// COMPREHENSIVE SEAT BOOKING TEST
// Run this step-by-step in browser console

console.log('🎭 COMPREHENSIVE SEAT BOOKING TEST');
console.log('==================================');

// Step 1: Setup authentication
console.log('Step 1: Setting up authentication...');
localStorage.setItem('token', 'test-token-123');
localStorage.setItem('user', JSON.stringify({
  id: 'test-user-123',
  name: 'Test User',
  email: 'test@example.com',
  role: 'USER',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z'
}));
console.log('✅ Authentication setup complete');

// Step 2: Navigate to seat booking event
console.log('Step 2: Navigate to: http://localhost:3001/events/cmfhy33ti0003nvc3jg1163zx');

// Step 3: Monitor booking flow
console.log('Step 3: Setting up monitoring...');

// Override setState functions to monitor state changes
const originalSetState = React.useState;
window.bookingStates = {};

// Monitor booking loading state
let bookingLoadingWatcher = setInterval(() => {
  const button = document.querySelector('button[class*="bg-blue-600"]');
  if (button) {
    const isLoading = button.textContent.includes('Processing');
    const hasSpinner = button.querySelector('.animate-spin');
    
    if (isLoading !== window.bookingStates.isLoading) {
      console.log('🔄 Booking Loading State:', { 
        isLoading, 
        hasSpinner: !!hasSpinner,
        buttonText: button.textContent.trim()
      });
      window.bookingStates.isLoading = isLoading;
    }
  }
}, 100);

// Monitor popup state
let popupWatcher = setInterval(() => {
  const popup = document.querySelector('[class*="fixed"][class*="inset-0"]');
  const hasPopup = !!popup;
  
  if (hasPopup !== window.bookingStates.hasPopup) {
    console.log('🎉 Congratulations Popup:', { visible: hasPopup });
    window.bookingStates.hasPopup = hasPopup;
  }
}, 100);

// Stop watchers after 30 seconds
setTimeout(() => {
  clearInterval(bookingLoadingWatcher);
  clearInterval(popupWatcher);
  console.log('🛑 Monitoring stopped');
}, 30000);

console.log('✅ Monitoring active for 30 seconds');

// Step 4: Instructions
console.log(`
🎯 TEST INSTRUCTIONS:
===================
1. Refresh the page if you haven't already
2. Look for the seat selection interface
3. Click on 2-3 seats to select them
4. Scroll down and find the "Book X Selected Seat(s)" button
5. Click the button and watch the console

Expected behavior:
✅ Button shows spinner and "Processing..." text
✅ After ~2 seconds, congratulations popup appears
✅ NO toast messages during the process
✅ Console shows state changes

If something goes wrong:
❌ Check if you're on the right page
❌ Make sure seats are selected (button should not be disabled)
❌ Look for error messages in console
❌ Verify authentication is set up correctly
`);

// Step 5: Quick validation
setTimeout(() => {
  console.log('🔍 Quick Environment Check:');
  console.log('- URL:', window.location.href);
  console.log('- Auth Token:', !!localStorage.getItem('token'));
  console.log('- User:', JSON.parse(localStorage.getItem('user') || '{}').name);
  
  const seatSelection = document.querySelector('[class*="seat"]') || document.querySelector('svg');
  console.log('- Seat UI:', !!seatSelection);
  
  const bookButton = document.querySelector('button[class*="bg-blue-600"]');
  console.log('- Book Button:', !!bookButton);
  console.log('- Button Text:', bookButton?.textContent?.trim());
}, 2000);
