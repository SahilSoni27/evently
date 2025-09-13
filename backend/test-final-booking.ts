#!/usr/bin/env npx tsx

async function testFinalBooking() {
  console.log('🔍 Final test of booking functionality...\n');

  try {
    // Login
    const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'jane@evently.com',
        password: 'password123'
      })
    });

    const loginResult = await loginResponse.json();
    const token = loginResult.data.token;
    console.log('✅ Login successful with Jane');

    // Test a regular booking
    console.log('\n2. Making a booking...');
    const bookingData = {
      eventId: 'cmfig28410004nveqqsv1dclj', // Summer Music Festival
      quantity: 2
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
        message: bookingResult.message,
        originalError: bookingResult.originalError
      });
    } else {
      console.log('✅ Booking successful!');
      console.log('📋 Booking details:', {
        id: bookingResult.data.booking.id,
        quantity: bookingResult.data.booking.quantity,
        totalPrice: bookingResult.data.booking.totalPrice,
        status: bookingResult.data.booking.status
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFinalBooking();
