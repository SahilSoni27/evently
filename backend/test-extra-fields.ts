#!/usr/bin/env npx tsx

async function testWithExtraFields() {
  console.log('🔍 Testing booking with extra fields like frontend sends...\n');

  try {
    // Login
    const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@evently.com',
        password: 'password123'
      })
    });

    const loginResult = await loginResponse.json();
    const token = loginResult.data.token;
    console.log('✅ Login successful');

    // Test with extra totalPrice field (as frontend sends)
    console.log('\n2. Testing with totalPrice field (as frontend sends)...');
    const bookingData = {
      eventId: 'cmfig27wb0003nveqxb9e6xza',
      quantity: 1,
      totalPrice: '299.99' // This is what frontend is sending
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
        result: bookingResult
      });
      
      if (bookingResult.errors) {
        console.error('📋 Validation errors:', bookingResult.errors);
      }
    } else {
      console.log('✅ Booking successful:', bookingResult.status);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWithExtraFields();
