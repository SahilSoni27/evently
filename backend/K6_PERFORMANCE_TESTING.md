# K6 Performance Testing Suite

This directory contains a comprehensive performance testing suite for Evently using K6.

## Quick Start

```bash
# Install k6 (if not already installed)
brew install k6

# Run all performance tests
./run-all-k6-tests.sh

# Run tests against localhost
./run-all-k6-tests.sh http://localhost:3000

# Run individual tests
k6 run k6-performance-test.js
k6 run k6-concurrent-booking.js
k6 run k6-event-management.js
```

## Test Suite Overview

### 1. General Performance Test (`k6-performance-test.js`)
- **Purpose**: Overall system performance benchmarking
- **Scenarios**: Warmup, Load, Stress, and Spike testing
- **Load Profile**: Up to 200 virtual users
- **Duration**: ~8 minutes total
- **Key Metrics**: Response time, throughput, error rate

### 2. Concurrent Booking Test (`k6-concurrent-booking.js`)
- **Purpose**: Simulates Taylor Swift concert ticket rush
- **Scenario**: 100 users booking simultaneously
- **Load Profile**: 500 booking attempts in 2 minutes
- **Key Metrics**: Booking success rate, seat selection time, waitlist conversion
- **Real-world Simulation**: Peak demand scenario

### 3. Event Management Test (`k6-event-management.js`)
- **Purpose**: Tests organizer workflows and admin operations
- **Scenarios**: Event creation, updates, dashboard loads
- **Load Profile**: 5-50 virtual users over 8 minutes
- **Key Metrics**: Event creation success, query performance, analytics load

## Configuration

### Environment Variables
- `BASE_URL`: Target server URL (default: production URL)
- Test runs against your deployed Evently instance

### Test Data Requirements
- Update event IDs in test files to match your database
- Tests use predefined user accounts (ensure they exist)

## Interpreting Results

### Key Performance Indicators (KPIs)

**Response Times:**
- `http_req_duration`: Average response time
- `p(90)`, `p(95)`, `p(99)`: Percentile response times
- Target: p(95) < 2000ms for most operations

**Throughput:**
- `http_reqs`: Total requests processed
- `http_req_rate`: Requests per second
- Target: Stable under sustained load

**Reliability:**
- `http_req_failed`: Failed request percentage
- `concurrent_booking_success`: Booking success rate
- Target: <1% failure rate, >50% booking success under extreme load

**Custom Metrics:**
- `seat_selection_duration`: Time to load seat selection
- `waitlist_conversion_rate`: Fallback system effectiveness
- `event_creation_success`: Admin operation reliability

### Expected Performance Benchmarks

**Good Performance:**
- Login: <500ms average
- Event browsing: <1000ms average
- Booking process: <2000ms average
- Concurrent booking success: >50% under extreme load

**Concerning Indicators:**
- Response times >3000ms consistently
- Error rates >5%
- Booking success <30% under load
- System crashes (HTTP 500 errors)

## Results Analysis

### Output Files
- `k6-results/`: Directory containing all test results
- `performance_summary_[timestamp].md`: Human-readable summary
- `[test_name]_[timestamp].json`: Detailed metrics (JSON format)

### Common Patterns to Look For

**Scaling Issues:**
- Response times increasing with user load
- Higher error rates at peak traffic
- Database connection timeouts

**Bottlenecks:**
- Specific endpoints with consistently high response times
- Memory or CPU spikes during tests
- Redis connection issues

**Success Indicators:**
- Consistent response times across load levels
- High booking success rates even under stress
- Graceful degradation (waitlist when capacity reached)

## Troubleshooting

### Common Issues

**Connection Errors:**
- Verify BASE_URL is accessible
- Check if server is running
- Confirm network connectivity

**Authentication Failures:**
- Ensure test users exist in database
- Verify JWT token generation works
- Check user credentials in test files

**Redis/Database Errors:**
- Monitor Redis connection stability
- Check database connection limits
- Verify transaction timeout settings

### Performance Optimization Tips

**If response times are high:**
- Check database query performance
- Optimize Redis usage
- Review API endpoint logic
- Consider connection pooling

**If booking failures are high:**
- Review transaction isolation
- Check concurrent booking protection
- Verify idempotency implementation
- Monitor database locks

## Continuous Integration

You can integrate these tests into your CI/CD pipeline:

```yaml
# Example GitHub Actions step
- name: Performance Tests
  run: |
    cd backend
    npm install -g k6
    ./run-all-k6-tests.sh ${{ secrets.STAGING_URL }}
```

## Advanced Usage

### Custom Test Scenarios
Create your own test files using the existing ones as templates. Focus on:
- Your specific user journeys
- Business-critical operations
- Peak usage patterns

### Monitoring Integration
Consider integrating with monitoring tools:
- Grafana dashboards for real-time metrics
- Alert systems for performance degradation
- Historical performance tracking

---

**Note**: Always run performance tests against staging/test environments first. Production testing should be carefully planned and approved.
