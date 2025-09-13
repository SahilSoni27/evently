#!/usr/bin/env npx tsx

async function testBookingWithAuth() {
  console.log('🔍 Testing booking API with authentication...\n');

  try {
    // First, login to get a token
    console.log('1. Logging in...');
    const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'user@evently.com',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      const loginError = await loginResponse.json();
      console.error('❌ Login failed:', loginError);
      return;
    }

    const loginResult = await loginResponse.json();
    console.log('✅ Login successful');
    console.log('📋 Login response:', loginResult);
    
    const token = loginResult.token || loginResult.data?.token;
    if (!token) {
      console.error('❌ No token in response');
      return;
    }
    console.log('🔑 Token obtained:', token.substring(0, 20) + '...');

    // Now make the booking request
    console.log('\n2. Creating booking...');
    const bookingData = {
      eventId: 'cmfig27wb0003nveqxb9e6xza', // Tech Conference 2025
      quantity: 1
    };

    console.log('📝 Booking data:', bookingData);

    const bookingResponse = await fetch('http://localhost:4000/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(bookingData)
    });

    const bookingResult = await bookingResponse.json();
    
    if (!bookingResponse.ok) {
      console.error('❌ Booking failed:', {
        status: bookingResponse.status,
        statusText: bookingResponse.statusText,
        result: bookingResult
      });
      
      // Log the detailed error
      if (bookingResult.stack) {
        console.error('📋 Error stack:', bookingResult.stack);
      }
      
    } else {
      console.log('✅ Booking successful:', bookingResult);
    }

  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

testBookingWithAuth();
