#!/usr/bin/env npx tsx

async function testDatabaseConstraintViolations() {
  console.log('🔍 Testing potential database constraint violations...\n');

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

    // First, make a successful booking to get an idempotency key
    console.log('\n1. Making initial booking...');
    const initialBookingData = {
      eventId: 'cmfig27wb0003nveqxb9e6xza',
      quantity: 1,
      idempotencyKey: 'test-duplicate-key-123'
    };

    const firstResponse = await fetch('http://localhost:4000/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(initialBookingData)
    });

    const firstResult = await firstResponse.json();
    if (firstResponse.ok) {
      console.log('✅ Initial booking successful');
    } else {
      console.log('❌ Initial booking failed:', firstResult.message);
    }

    // Now try to make the same booking again (should return existing booking)
    console.log('\n2. Trying duplicate idempotency key...');
    const secondResponse = await fetch('http://localhost:4000/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(initialBookingData)
    });

    const secondResult = await secondResponse.json();
    if (secondResponse.ok) {
      console.log('✅ Duplicate booking handled correctly (returned existing)');
    } else {
      console.log('❌ Duplicate booking failed:', {
        status: secondResponse.status,
        message: secondResult.message,
        originalError: secondResult.originalError
      });
    }

    // Test booking an event that's past (if any)
    console.log('\n3. Testing booking for past event...');
    // First let's see if there are any past events
    const eventsResponse = await fetch('http://localhost:4000/api/events');
    const eventsResult = await eventsResponse.json();
    console.log('Available events:', (eventsResult.data || eventsResult).events?.length || 'N/A');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDatabaseConstraintViolations();
