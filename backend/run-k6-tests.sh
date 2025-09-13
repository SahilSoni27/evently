#!/bin/bash

# Evently K6 Performance Test Suite
# This script runs comprehensive performance tests and generates reports

echo "🚀 Evently Performance Testing Suite"
echo "===================================="

# Configuration
BASE_URL="https://evently-p02p.onrender.com"
EVENT_ID="cmfig27wb0003nveqxb9e6xza"  # Update with your actual event ID
RESULTS_DIR="./k6-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create results directory
mkdir -p $RESULTS_DIR

echo "📊 Test Configuration:"
echo "  Base URL: $BASE_URL"
echo "  Event ID: $EVENT_ID"
echo "  Results: $RESULTS_DIR"
echo ""

# Test 1: Quick Health Check
echo "🏥 Running Health Check..."
k6 run --duration 30s --vus 5 \
  -e BASE_URL=$BASE_URL \
  -e EVENT_ID=$EVENT_ID \
  --out json=$RESULTS_DIR/health_check_$TIMESTAMP.json \
  --summary-export=$RESULTS_DIR/health_summary_$TIMESTAMP.json \
  k6-performance-test.js

# Test 2: Load Test (Normal Traffic)
echo ""
echo "📈 Running Load Test (Normal Traffic)..."
k6 run --duration 3m --vus 25 \
  -e BASE_URL=$BASE_URL \
  -e EVENT_ID=$EVENT_ID \
  --out json=$RESULTS_DIR/load_test_$TIMESTAMP.json \
  --summary-export=$RESULTS_DIR/load_summary_$TIMESTAMP.json \
  k6-performance-test.js

# Test 3: Stress Test (Peak Traffic)
echo ""
echo "🔥 Running Stress Test (Peak Traffic)..."
k6 run --duration 5m \
  --stage 1m:50 --stage 2m:50 --stage 1m:100 --stage 1m:0 \
  -e BASE_URL=$BASE_URL \
  -e EVENT_ID=$EVENT_ID \
  --out json=$RESULTS_DIR/stress_test_$TIMESTAMP.json \
  --summary-export=$RESULTS_DIR/stress_summary_$TIMESTAMP.json \
  k6-performance-test.js

# Test 4: Spike Test (Taylor Swift Scenario)
echo ""
echo "⚡ Running Spike Test (Concert Rush)..."
k6 run --duration 2m \
  --stage 10s:200 --stage 1m:200 --stage 30s:0 \
  -e BASE_URL=$BASE_URL \
  -e EVENT_ID=$EVENT_ID \
  --out json=$RESULTS_DIR/spike_test_$TIMESTAMP.json \
  --summary-export=$RESULTS_DIR/spike_summary_$TIMESTAMP.json \
  k6-performance-test.js

# Test 5: Booking-focused Test
echo ""
echo "🎫 Running Booking-focused Test..."
k6 run --duration 2m --vus 30 \
  -e BASE_URL=$BASE_URL \
  -e EVENT_ID=$EVENT_ID \
  -e PHASE=booking \
  --out json=$RESULTS_DIR/booking_test_$TIMESTAMP.json \
  --summary-export=$RESULTS_DIR/booking_summary_$TIMESTAMP.json \
  k6-performance-test.js

echo ""
echo "✅ All tests completed!"
echo "📁 Results saved in: $RESULTS_DIR"
echo ""
echo "📊 Quick Results Summary:"
echo "========================"

# Generate quick summary if jq is available
if command -v jq &> /dev/null; then
  echo "🔍 Processing results..."
  
  for file in $RESULTS_DIR/*summary*$TIMESTAMP.json; do
    if [ -f "$file" ]; then
      echo ""
      echo "📈 $(basename $file):"
      echo "   Average Response Time: $(jq '.metrics.http_req_duration.values.avg' $file)ms"
      echo "   95th Percentile: $(jq '.metrics.http_req_duration.values["p(95)"]' $file)ms"
      echo "   Error Rate: $(jq '.metrics.http_req_failed.values.rate * 100' $file)%"
      echo "   Requests/sec: $(jq '.metrics.http_reqs.values.rate' $file)"
    fi
  done
else
  echo "📋 Install 'jq' for detailed result analysis"
  echo "   Results are saved as JSON in: $RESULTS_DIR"
fi

echo ""
echo "🎯 Performance Benchmarks Complete!"
echo "   Use these results to showcase your app's capabilities"
