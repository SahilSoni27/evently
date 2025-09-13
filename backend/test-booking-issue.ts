#!/usr/bin/env npx tsx

import { Request, Response } from 'express';

// Test the exact booking request to reproduce the error
async function testBookingAPI() {
  console.log('🔍 Testing booking API directly...\n');

  const bookingData = {
    eventId: 'cm1dv46dw000bjp5e3xgya1pm', // Using an existing event ID
    quantity: 1,
    idempotencyKey: 'test-' + Date.now()
  };

  console.log('📝 Booking data:', bookingData);

  try {
    const response = await fetch('http://localhost:4000/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token' // We need to handle auth
      },
      body: JSON.stringify(bookingData)
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ API Error:', {
        status: response.status,
        statusText: response.statusText,
        result
      });
    } else {
      console.log('✅ Booking successful:', result);
    }

  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

testBookingAPI();
