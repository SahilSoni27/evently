#!/bin/bash

# K6 Performance Test Suite Runner for Evently
# Usage: ./run-all-k6-tests.sh [BASE_URL]

set -e  # Exit on any error

# Configuration
BASE_URL=${1:-"https://evently-p02p.onrender.com"}
RESULTS_DIR="k6-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SUMMARY_FILE="$RESULTS_DIR/performance_summary_$TIMESTAMP.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Create results directory
mkdir -p "$RESULTS_DIR"

# Function to run a test and capture results
run_test() {
    local test_file=$1
    local test_name=$2
    local output_file="$RESULTS_DIR/${test_name}_$TIMESTAMP.json"
    
    echo -e "${BLUE}🚀 Running $test_name...${NC}"
    echo "   Test: $test_file"
    echo "   URL: $BASE_URL"
    echo
    
    # Run k6 test with JSON output
    if k6 run --out json="$output_file" -e BASE_URL="$BASE_URL" "$test_file"; then
        echo -e "${GREEN}✅ $test_name completed successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name failed${NC}"
        return 1
    fi
}

# Function to extract key metrics from JSON results
extract_metrics() {
    local json_file=$1
    local test_name=$2
    
    if [[ ! -f "$json_file" ]]; then
        echo "⚠️  No results file found for $test_name"
        return
    fi
    
    echo "## $test_name Results" >> "$SUMMARY_FILE"
    echo >> "$SUMMARY_FILE"
    
    # Extract summary metrics using jq if available
    if command -v jq >/dev/null 2>&1; then
        local summary=$(tail -1 "$json_file" | jq -r '
            if .type == "Point" and .metric == "http_reqs" then
                "**Total Requests:** " + (.data.value | tostring)
            else empty end,
            if .type == "Point" and .metric == "http_req_duration" then
                "**Average Response Time:** " + (.data.value | tostring) + "ms"
            else empty end,
            if .type == "Point" and .metric == "http_req_failed" then
                "**Failed Requests:** " + ((.data.value * 100) | tostring) + "%"
            else empty end
        ' 2>/dev/null)
        
        if [[ -n "$summary" ]]; then
            echo "$summary" >> "$SUMMARY_FILE"
        else
            echo "✅ Test completed - detailed metrics in $json_file" >> "$SUMMARY_FILE"
        fi
    else
        echo "✅ Test completed - detailed metrics in $json_file" >> "$SUMMARY_FILE"
    fi
    
    echo >> "$SUMMARY_FILE"
}

# Main execution
main() {
    echo -e "${PURPLE}🎯 K6 Performance Testing Suite for Evently${NC}"
    echo -e "${PURPLE}================================================${NC}"
    echo
    echo "Target URL: $BASE_URL"
    echo "Results Directory: $RESULTS_DIR"
    echo "Timestamp: $TIMESTAMP"
    echo
    
    # Check if k6 is installed
    if ! command -v k6 >/dev/null 2>&1; then
        echo -e "${RED}❌ k6 is not installed. Please install k6 first:${NC}"
        echo "   macOS: brew install k6"
        echo "   Other: https://k6.io/docs/getting-started/installation/"
        exit 1
    fi
    
    # Initialize summary file
    cat > "$SUMMARY_FILE" << EOF
# Evently Performance Test Results
**Date:** $(date)
**Target URL:** $BASE_URL
**Test Suite Version:** 1.0

---

EOF
    
    # Track overall results
    local total_tests=0
    local passed_tests=0
    
    # Test 1: General Performance
    if [[ -f "k6-performance-test.js" ]]; then
        ((total_tests++))
        if run_test "k6-performance-test.js" "General_Performance"; then
            ((passed_tests++))
            extract_metrics "$RESULTS_DIR/General_Performance_$TIMESTAMP.json" "General Performance Test"
        fi
        echo
    fi
    
    # Test 2: Concurrent Booking
    if [[ -f "k6-concurrent-booking.js" ]]; then
        ((total_tests++))
        echo -e "${YELLOW}⚠️  Concurrent booking test will simulate high load${NC}"
        echo "   This test simulates 100 users booking simultaneously"
        echo "   Press Ctrl+C within 5 seconds to skip..."
        sleep 5
        
        if run_test "k6-concurrent-booking.js" "Concurrent_Booking"; then
            ((passed_tests++))
            extract_metrics "$RESULTS_DIR/Concurrent_Booking_$TIMESTAMP.json" "Concurrent Booking Test"
        fi
        echo
    fi
    
    # Test 3: Event Management
    if [[ -f "k6-event-management.js" ]]; then
        ((total_tests++))
        if run_test "k6-event-management.js" "Event_Management"; then
            ((passed_tests++))
            extract_metrics "$RESULTS_DIR/Event_Management_$TIMESTAMP.json" "Event Management Test"
        fi
        echo
    fi
    
    # Generate final summary
    echo "---" >> "$SUMMARY_FILE"
    echo >> "$SUMMARY_FILE"
    echo "## Overall Test Summary" >> "$SUMMARY_FILE"
    echo "- **Total Tests:** $total_tests" >> "$SUMMARY_FILE"
    echo "- **Passed:** $passed_tests" >> "$SUMMARY_FILE"
    echo "- **Failed:** $((total_tests - passed_tests))" >> "$SUMMARY_FILE"
    echo "- **Success Rate:** $(( passed_tests * 100 / total_tests ))%" >> "$SUMMARY_FILE"
    echo >> "$SUMMARY_FILE"
    echo "## Files Generated" >> "$SUMMARY_FILE"
    echo "- Detailed JSON results in \`$RESULTS_DIR/\`" >> "$SUMMARY_FILE"
    echo "- Summary report: \`$SUMMARY_FILE\`" >> "$SUMMARY_FILE"
    
    # Final output
    echo -e "${PURPLE}📊 Test Suite Summary${NC}"
    echo -e "${PURPLE}==================${NC}"
    echo "Total Tests: $total_tests"
    echo "Passed: $passed_tests"
    echo "Failed: $((total_tests - passed_tests))"
    
    if [[ $passed_tests -eq $total_tests ]]; then
        echo -e "${GREEN}🎉 All tests passed!${NC}"
    else
        echo -e "${YELLOW}⚠️  Some tests had issues${NC}"
    fi
    
    echo
    echo -e "${BLUE}📋 Results Summary: $SUMMARY_FILE${NC}"
    echo -e "${BLUE}📁 Detailed Results: $RESULTS_DIR/${NC}"
    
    # Option to view summary
    echo
    read -p "Would you like to view the summary now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command -v cat >/dev/null 2>&1; then
            echo -e "${BLUE}📄 Performance Summary:${NC}"
            echo
            cat "$SUMMARY_FILE"
        fi
    fi
}

# Run main function
main "$@"
