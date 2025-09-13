// 🔍 COMPREHENSIVE SEAT BOOKING DEBUG SCRIPT
// Copy and paste this entire script into the browser console

window.debugSeatBooking = function() {
    console.log('🎭 SEAT BOOKING COMPREHENSIVE DEBUG');
    console.log('=================================');

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
    console.log('✅ Auth set up - refresh the page if needed');

    // Step 2: Monitor state changes
    console.log('Step 2: Setting up state monitoring...');

    // Create a global monitor object
    window.seatBookingDebug = {
      bookingLoading: false,
      showCongratulations: false,
      lastBooking: null,
      selectedSeats: [],
      apiCalls: []
    };

    // Override fetch to monitor API calls
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      if (typeof url === 'string' && (url.includes('/api/seats/book') || url.includes('/api/bookings'))) {
        console.log('🌐 API Call:', { url, method: args[1]?.method || 'GET' });
        window.seatBookingDebug.apiCalls.push({ url, timestamp: new Date() });
      }
      
      return originalFetch.apply(this, args).then(response => {
        if (typeof url === 'string' && (url.includes('/api/seats/book') || url.includes('/api/bookings'))) {
          response.clone().json().then(data => {
            console.log('🌐 API Response:', { url, status: response.status, data });
          }).catch(() => {
            console.log('🌐 API Response:', { url, status: response.status, body: 'Non-JSON response' });
          });
        }
        return response;
      });
    };

    // Monitor button clicks
    document.addEventListener('click', function(e) {
      const button = e.target.closest('button');
      if (button && button.textContent.includes('Book') && button.textContent.includes('Seat')) {
        console.log('🖱️ Seat booking button clicked!');
        
        // Monitor button state changes
        const checkButtonState = setInterval(() => {
          const isLoading = button.textContent.includes('Processing');
          const hasSpinner = button.querySelector('.animate-spin');
          
          if (isLoading !== window.seatBookingDebug.bookingLoading) {
            console.log('🔄 Button State Change:', { 
              isLoading, 
              hasSpinner: !!hasSpinner,
              buttonText: button.textContent.trim(),
              disabled: button.disabled
            });
            window.seatBookingDebug.bookingLoading = isLoading;
            
            if (!isLoading) {
              clearInterval(checkButtonState);
            }
          }
        }, 100);
        
        // Stop monitoring after 10 seconds
        setTimeout(() => clearInterval(checkButtonState), 10000);
      }
    });

    // Monitor popup appearance
    const checkPopup = setInterval(() => {
      const popup = document.querySelector('[class*="fixed"][class*="inset-0"]');
      const hasPopup = !!popup;
      
      if (hasPopup !== window.seatBookingDebug.showCongratulations) {
        console.log('🎉 Popup State Change:', { 
          visible: hasPopup,
          popupContent: popup ? popup.textContent.substring(0, 100) + '...' : null
        });
        window.seatBookingDebug.showCongratulations = hasPopup;
      }
    }, 200);

    // Monitor selected seats
    const checkSeats = setInterval(() => {
      const selectedSeatElements = document.querySelectorAll('[class*="selected"], [class*="bg-blue"], [class*="bg-green"]');
      const currentCount = selectedSeatElements.length;
      
      if (currentCount !== window.seatBookingDebug.selectedSeats.length) {
        console.log('🪑 Seat Selection Change:', { 
          count: currentCount,
          seats: Array.from(selectedSeatElements).map(el => el.textContent || el.getAttribute('data-seat-id') || 'Unknown')
        });
        window.seatBookingDebug.selectedSeats = Array.from(selectedSeatElements);
      }
    }, 500);

    // Stop monitoring after 2 minutes
    setTimeout(() => {
      clearInterval(checkPopup);
      clearInterval(checkSeats);
      console.log('🛑 Monitoring stopped after 2 minutes');
    }, 120000);

    console.log(`
🎯 DEBUG SETUP COMPLETE
=====================
✅ Authentication configured
✅ API call monitoring active
✅ Button state monitoring ready
✅ Popup detection active
✅ Seat selection tracking enabled

📋 NOW TEST THE FLOW:
1. Select 2-3 seats
2. Click "Book X Selected Seat(s)" button
3. Watch console for detailed debug info

🔍 What to look for:
• "Seat booking button clicked!" when you click
• "Button State Change" showing loading spinner
• "API Call" and "API Response" logs
• "Popup State Change" when congratulations should appear
• Any error messages or unexpected behavior

If the popup doesn't appear, check:
• Was the API call successful?
• Did the button loading state work?
• Are there any console errors?
• Did the seat booking API return success: true?
`);

    // Quick validation
    setTimeout(() => {
      console.log('🔍 Environment Check:');
      console.log('- Current URL:', window.location.href);
      console.log('- Auth Token exists:', !!localStorage.getItem('token'));
      console.log('- User exists:', !!localStorage.getItem('user'));
      
      const bookButton = document.querySelector('button');
      console.log('- Found booking button:', !!bookButton);
      
      const seatElements = document.querySelectorAll('[class*="seat"], svg, rect');
      console.log('- Found seat elements:', seatElements.length);
      
      // Test the congratulations popup component
      window.testPopup = () => {
        console.log('🧪 Testing popup manually...');
        // You can call this from console to test popup
        const popup = document.createElement('div');
        popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px;border:2px solid green;z-index:9999';
        popup.innerHTML = '<h2>Test Popup</h2><p>This is a test popup to verify rendering works</p><button onclick="this.parentElement.remove()">Close</button>';
        document.body.appendChild(popup);
      };
      
      console.log('💡 You can also run window.testPopup() to test popup rendering manually');
    }, 1000);
};

