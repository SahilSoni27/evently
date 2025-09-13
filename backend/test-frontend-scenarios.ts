#!/usr/bin/env npx tsx

// This script will make the exact same request as the frontend would make

async function simulateFrontendBookingRequest() {
  console.log('🔍 Simulating frontend booking request...\n');

  try {
    // First login to get the token
    console.log('1. Logging in as test user...');
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

    const loginResult = await loginResponse.json();
    const token = loginResult.data.token;
    console.log('✅ Login successful');

    // Now let's try to create a booking that might fail
    console.log('\n2. Creating booking...');
    
    // Try different scenarios that might cause issues
    const testCases = [
      {
        name: 'Valid booking',
        data: {
          eventId: 'cmfig27wb0003nveqxb9e6xza',
          quantity: 1
        }
      },
      {
        name: 'Invalid event ID',
        data: {
          eventId: 'invalid-event-id',
          quantity: 1
        }
      },
      {
        name: 'Quantity as string (frontend might send this)',
        data: {
          eventId: 'cmfig27wb0003nveqxb9e6xza',
          quantity: '1' // String instead of number
        }
      },
      {
        name: 'Empty idempotency key',
        data: {
          eventId: 'cmfig27wb0003nveqxb9e6xza',
          quantity: 1,
          idempotencyKey: ''
        }
      },
      {
        name: 'Missing quantity',
        data: {
          eventId: 'cmfig27wb0003nveqxb9e6xza'
        }
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n--- Testing: ${testCase.name} ---`);
      console.log('📝 Data:', testCase.data);

      try {
        const bookingResponse = await fetch('http://localhost:4000/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(testCase.data)
        });

        const bookingResult = await bookingResponse.json();
        
        if (!bookingResponse.ok) {
          console.error(`❌ ${testCase.name} failed:`, {
            status: bookingResponse.status,
            result: bookingResult
          });
        } else {
          console.log(`✅ ${testCase.name} succeeded:`, bookingResult.status);
        }
      } catch (error) {
        console.error(`❌ ${testCase.name} threw error:`, error.message);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

simulateFrontendBookingRequest();
