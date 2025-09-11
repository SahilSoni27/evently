#!/bin/bash

# Redis Monitoring Script for Evently
echo "📊 REDIS MONITORING DASHBOARD"
echo "==============================="

# Function to run Redis command and format output
redis_cmd() {
    echo -e "\n🔍 $1"
    echo "---"
    redis-cli $2
}

# Check Redis connection
echo "🚀 Redis Connection Status:"
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is running and responsive"
else
    echo "❌ Redis is not running or not responsive"
    exit 1
fi

# Redis Info
redis_cmd "Redis Server Info" "INFO server | grep -E 'redis_version|uptime_in_seconds|connected_clients'"

# Memory usage
redis_cmd "Memory Usage" "INFO memory | grep -E 'used_memory_human|used_memory_peak_human'"

# Check BullMQ queues
redis_cmd "BullMQ Queue Keys" "KEYS 'bull:*'"

# Check analytics cache
redis_cmd "Analytics Cache Keys" "KEYS 'analytics:*'"

# Check all cache keys
redis_cmd "All Cache Keys" "KEYS '*' | head -20"

# Key count
redis_cmd "Total Keys Count" "DBSIZE"

# Queue statistics
echo -e "\n📈 BullMQ Queue Statistics:"
echo "---"
for queue in "email-notifications" "analytics-processing" "event-reminders"; do
    waiting=$(redis-cli LLEN "bull:${queue}:waiting" 2>/dev/null || echo "0")
    active=$(redis-cli LLEN "bull:${queue}:active" 2>/dev/null || echo "0")
    completed=$(redis-cli LLEN "bull:${queue}:completed" 2>/dev/null || echo "0")
    failed=$(redis-cli LLEN "bull:${queue}:failed" 2>/dev/null || echo "0")
    
    echo "📬 Queue: ${queue}"
    echo "   Waiting: ${waiting}, Active: ${active}, Completed: ${completed}, Failed: ${failed}"
done

# Recent activity (last 10 keys with TTL)
echo -e "\n⏰ Keys with TTL:"
echo "---"
redis-cli --scan --pattern "*" | head -10 | while read key; do
    ttl=$(redis-cli TTL "$key")
    if [ "$ttl" -gt 0 ]; then
        echo "🔑 $key (expires in ${ttl}s)"
    fi
done

echo -e "\n==============================="
echo "📊 Redis monitoring complete!"
echo "Use 'redis-cli monitor' to see real-time commands"
