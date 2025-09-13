#!/usr/bin/env npx tsx

async function testBookingIssues() {
  console.log('🔍 Testing potential booking issues that could occur in production...\n');

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

    // Test scenarios that might cause Prisma errors
    const testCases = [
      {
        name: 'Booking with null values',
        data: {
          eventId: 'cmfig27wb0003nveqxb9e6xza',
          quantity: null,
        }
      },
      {
        name: 'Booking with undefined values',  
        data: {
          eventId: 'cmfig27wb0003nveqxb9e6xza',
          quantity: undefined,
        }
      },
      {
        name: 'Booking to non-existent event (CUID but not in DB)',
        data: {
          eventId: 'cmfig27wb0003nveqxb9e6xzb', // Similar but not real
          quantity: 1,
        }
      },
      {
        name: 'Booking with negative quantity',
        data: {
          eventId: 'cmfig27wb0003nveqxb9e6xza',
          quantity: -1,
        }
      },
      {
        name: 'Booking with very large quantity',
        data: {
          eventId: 'cmfig27wb0003nveqxb9e6xza',
          quantity: 999999,
        }
      },
      {
        name: 'Booking with non-integer quantity',
        data: {
          eventId: 'cmfig27wb0003nveqxb9e6xza',
          quantity: 1.5,
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
          console.error(`❌ ${testCase.name}:`, {
            status: bookingResponse.status,
            message: bookingResult.message,
            originalError: bookingResult.originalError
          });
        } else {
          console.log(`✅ ${testCase.name}: Unexpectedly succeeded`);
        }
      } catch (error) {
        console.error(`❌ ${testCase.name} network error:`, error.message);
      }
    }

  } catch (error) {
    console.error('❌ Test setup failed:', error);
  }
}

testBookingIssues();
