/**
 * Concurrency Test Script for Event Booking System
 * Tests optimistic locking, idempotency, and prevents overselling
 */

import axios from 'axios';
import { faker } from '@faker-js/faker';

// Configuration
const API_BASE_URL = 'http://localhost:4000/api';
const TEST_CONCURRENCY_LEVELS = [10, 25, 50, 100];
const EVENT_CAPACITY = 20;
const TICKETS_PER_USER = 1;

interface TestUser {
  id: string;
  email: string;
  token: string;
  name: string;
}

interface TestEvent {
  id: string;
  name: string;
  capacity: number;
  availableCapacity: number;
}

interface BookingResult {
  success: boolean;
  bookingId?: string;
  error?: string;
  responseTime: number;
  statusCode?: number;
}

class ConcurrencyTester {
  private users: TestUser[] = [];
  private testEvent: TestEvent | null = null;
  private adminToken: string = '';

  async setup() {
    console.log('🚀 Setting up concurrency test...\n');
    
    // Login as admin to create test data
    await this.loginAsAdmin();
    
    // Create test event
    await this.createTestEvent();
    
    // Create test users
    await this.createTestUsers(100); // Create more users than we'll use
    
    console.log('✅ Setup completed!\n');
  }

  async loginAsAdmin() {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: 'admin@evently.com',
        password: 'admin123'
      });
      
      this.adminToken = response.data.data.token;
      console.log('✅ Admin login successful');
    } catch (error: any) {
      console.error('❌ Admin login failed:', error.response?.data?.message || error.message);
      throw error;
    }
  }

  async createTestEvent() {
    try {
      const eventData = {
        name: `Concurrency Test Event ${Date.now()}`,
        description: 'Test event for concurrency testing',
        venue: 'Test Venue',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        capacity: EVENT_CAPACITY,
        price: 50.00,
        category: 'CONFERENCE'
      };

      const response = await axios.post(`${API_BASE_URL}/events`, eventData, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      this.testEvent = response.data.data.event;
      console.log(`✅ Test event created: ${this.testEvent!.name} (ID: ${this.testEvent!.id})`);
      console.log(`   Capacity: ${this.testEvent!.capacity}`);
    } catch (error: any) {
      console.error('❌ Failed to create test event:', error.response?.data?.message || error.message);
      throw error;
    }
  }

  async createTestUsers(count: number) {
    console.log(`Creating ${count} test users...`);
    
    const userPromises = Array.from({ length: count }, async (_, i) => {
      const userData = {
        name: faker.person.fullName(),
        email: `testuser${i}@concurrency.test`,
        password: 'password123'
      };

      try {
        // Register user
        const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, userData);
        
        // Login to get token
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
          email: userData.email,
          password: userData.password
        });

        return {
          id: registerResponse.data.data.user.id,
          email: userData.email,
          name: userData.name,
          token: loginResponse.data.data.token
        };
      } catch (error: any) {
        // If user already exists, try to login
        if (error.response?.status === 409) {
          try {
            const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
              email: userData.email,
              password: userData.password
            });

            return {
              id: loginResponse.data.data.user.id,
              email: userData.email,
              name: userData.name,
              token: loginResponse.data.data.token
            };
          } catch (loginError) {
            console.warn(`⚠️  Failed to login existing user ${userData.email}`);
            return null;
          }
        }
        console.warn(`⚠️  Failed to create user ${userData.email}:`, error.response?.data?.message);
        return null;
      }
    });

    const results = await Promise.all(userPromises);
    this.users = results.filter(user => user !== null) as TestUser[];
    
    console.log(`✅ Created ${this.users.length} test users`);
  }

  async simulateConcurrentBookings(concurrency: number): Promise<BookingResult[]> {
    if (!this.testEvent) {
      throw new Error('Test event not created');
    }

    console.log(`\n🎯 Testing with ${concurrency} concurrent users...`);
    console.log(`   Event: ${this.testEvent.name}`);
    console.log(`   Available capacity: ${this.testEvent.capacity}`);
    console.log(`   Expected successful bookings: ${Math.min(concurrency * TICKETS_PER_USER, this.testEvent.capacity)}`);

    const selectedUsers = this.users.slice(0, concurrency);
    
    // Create booking promises for concurrent execution
    const bookingPromises = selectedUsers.map(user => this.attemptBooking(user));
    
    // Execute all bookings concurrently
    const startTime = Date.now();
    const results = await Promise.all(bookingPromises);
    const endTime = Date.now();
    
    console.log(`⏱️  Total execution time: ${endTime - startTime}ms`);
    
    return results;
  }

  async attemptBooking(user: TestUser): Promise<BookingResult> {
    const startTime = Date.now();
    
    try {
      // Generate unique idempotency key for this booking attempt
      const idempotencyKey = `test_${user.id}_${this.testEvent!.id}_${Date.now()}_${Math.random()}`;
      
      const bookingData = {
        eventId: this.testEvent!.id,
        quantity: TICKETS_PER_USER,
        idempotencyKey
      };

      const response = await axios.post(`${API_BASE_URL}/bookings`, bookingData, {
        headers: { Authorization: `Bearer ${user.token}` },
        timeout: 10000 // 10 second timeout
      });

      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        bookingId: response.data.data.booking.id,
        responseTime,
        statusCode: response.status
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        responseTime,
        statusCode: error.response?.status
      };
    }
  }

  async verifyEventCapacity(): Promise<{ currentCapacity: number; expectedCapacity: number }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/events/${this.testEvent!.id}`);
      const event = response.data.data.event;
      
      return {
        currentCapacity: event.availableCapacity,
        expectedCapacity: this.testEvent!.capacity
      };
    } catch (error: any) {
      console.error('❌ Failed to verify event capacity:', error.response?.data?.message || error.message);
      throw error;
    }
  }

  async getBookingCount(): Promise<number> {
    try {
      const response = await axios.get(`${API_BASE_URL}/bookings?limit=100`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      const bookings = response.data.data.bookings.filter(
        (booking: any) => booking.eventId === this.testEvent!.id && booking.status === 'CONFIRMED'
      );
      
      return bookings.reduce((total: number, booking: any) => total + booking.quantity, 0);
    } catch (error: any) {
      console.error('❌ Failed to get booking count:', error.response?.data?.message || error.message);
      return 0;
    }
  }

  analyzeResults(results: BookingResult[], concurrency: number) {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    const maxResponseTime = Math.max(...results.map(r => r.responseTime));
    const minResponseTime = Math.min(...results.map(r => r.responseTime));
    
    console.log('\n📊 Results Analysis:');
    console.log(`   Successful bookings: ${successful.length}/${concurrency} (${(successful.length / concurrency * 100).toFixed(1)}%)`);
    console.log(`   Failed bookings: ${failed.length}/${concurrency} (${(failed.length / concurrency * 100).toFixed(1)}%)`);
    console.log(`   Average response time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   Min response time: ${minResponseTime}ms`);
    console.log(`   Max response time: ${maxResponseTime}ms`);
    
    // Analyze failure reasons
    if (failed.length > 0) {
      console.log('\n❌ Failure Reasons:');
      const failureReasons = failed.reduce((acc: any, result) => {
        const reason = result.error || 'Unknown error';
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(failureReasons).forEach(([reason, count]) => {
        console.log(`   ${reason}: ${count} occurrences`);
      });
    }

    return {
      successRate: successful.length / concurrency,
      avgResponseTime,
      maxResponseTime,
      minResponseTime,
      failureReasons: failed.reduce((acc: any, result) => {
        const reason = result.error || 'Unknown error';
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {})
    };
  }

  async runFullTest() {
    try {
      await this.setup();
      
      console.log('\n' + '='.repeat(60));
      console.log('🧪 STARTING CONCURRENCY TESTS');
      console.log('='.repeat(60));
      
      const allResults = [];
      
      for (const concurrency of TEST_CONCURRENCY_LEVELS) {
        console.log('\n' + '-'.repeat(40));
        
        // Reset event capacity before each test
        await this.resetEventCapacity();
        
        const results = await this.simulateConcurrentBookings(concurrency);
        const analysis = this.analyzeResults(results, concurrency);
        
        // Verify no overselling occurred
        const { currentCapacity } = await this.verifyEventCapacity();
        const totalBooked = await this.getBookingCount();
        
        console.log('\n🔍 Verification:');
        console.log(`   Total tickets booked: ${totalBooked}`);
        console.log(`   Remaining capacity: ${currentCapacity}`);
        console.log(`   Original capacity: ${EVENT_CAPACITY}`);
        
        const isValid = (totalBooked + currentCapacity) === EVENT_CAPACITY && totalBooked <= EVENT_CAPACITY;
        console.log(`   ✅ No overselling: ${isValid ? 'PASSED' : 'FAILED'}`);
        
        if (!isValid) {
          console.error(`❌ OVERSELLING DETECTED! Booked: ${totalBooked}, Remaining: ${currentCapacity}, Total should be: ${EVENT_CAPACITY}`);
        }
        
        allResults.push({
          concurrency,
          analysis,
          totalBooked,
          remainingCapacity: currentCapacity,
          overselling: !isValid
        });
        
        // Wait a bit between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Print summary
      this.printSummary(allResults);
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      process.exit(1);
    }
  }

  async resetEventCapacity() {
    try {
      // Delete all bookings for this event
      await axios.delete(`${API_BASE_URL}/admin/events/${this.testEvent!.id}/reset-bookings`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      // Reset event capacity
      await axios.put(`${API_BASE_URL}/events/${this.testEvent!.id}`, {
        availableCapacity: EVENT_CAPACITY
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      console.log('🔄 Event capacity reset to original state');
    } catch (error: any) {
      console.warn('⚠️  Could not reset event capacity automatically');
      // Continue with test anyway
    }
  }

  printSummary(results: any[]) {
    console.log('\n' + '='.repeat(60));
    console.log('📈 CONCURRENCY TEST SUMMARY');
    console.log('='.repeat(60));
    
    results.forEach(result => {
      console.log(`\n🎯 ${result.concurrency} concurrent users:`);
      console.log(`   Success rate: ${(result.analysis.successRate * 100).toFixed(1)}%`);
      console.log(`   Avg response time: ${result.analysis.avgResponseTime.toFixed(2)}ms`);
      console.log(`   Tickets booked: ${result.totalBooked}/${EVENT_CAPACITY}`);
      console.log(`   Overselling: ${result.overselling ? '❌ YES' : '✅ NO'}`);
    });
    
    const hasOverselling = results.some(r => r.overselling);
    const allSuccessful = results.every(r => r.analysis.successRate > 0.8); // At least 80% success rate
    
    console.log('\n' + '='.repeat(60));
    console.log(`🏆 OVERALL RESULT: ${hasOverselling || !allSuccessful ? '❌ FAILED' : '✅ PASSED'}`);
    console.log('='.repeat(60));
    
    if (hasOverselling) {
      console.log('❌ Overselling detected in one or more tests!');
    }
    if (!allSuccessful) {
      console.log('❌ Low success rate in one or more tests!');
    }
    if (!hasOverselling && allSuccessful) {
      console.log('✅ All tests passed! No overselling detected and good success rates.');
    }
  }
}

// Run the test
async function main() {
  const tester = new ConcurrencyTester();
  await tester.runFullTest();
}

if (require.main === module) {
  main().catch(console.error);
}

export { ConcurrencyTester };
