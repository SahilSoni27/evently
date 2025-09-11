"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = __importDefault(require("../lib/redis"));
async function testRedisOperations() {
    console.log('🔧 Testing Redis Cache Operations...\n');
    try {
        // Test basic set/get
        console.log('1. Testing basic set/get operations...');
        await redis_1.default.set('test:basic', { message: 'Hello Redis!', timestamp: Date.now() });
        const basicResult = await redis_1.default.get('test:basic');
        console.log('✅ Basic set/get:', basicResult);
        // Test TTL
        console.log('\n2. Testing TTL operations...');
        await redis_1.default.set('test:ttl', { data: 'expires in 5 seconds' }, 5);
        const ttlResult = await redis_1.default.get('test:ttl');
        console.log('✅ TTL set/get:', ttlResult);
        // Test exists
        console.log('\n3. Testing exists operations...');
        const exists = await redis_1.default.exists('test:basic');
        console.log('✅ Key exists:', exists);
        // Test hash operations
        console.log('\n4. Testing hash operations...');
        await redis_1.default.setHash('test:hash', 'field1', { nested: 'data' });
        const hashResult = await redis_1.default.getHash('test:hash', 'field1');
        console.log('✅ Hash operations:', hashResult);
        // Test increment
        console.log('\n5. Testing increment operations...');
        const counter1 = await redis_1.default.increment('test:counter', 5);
        const counter2 = await redis_1.default.increment('test:counter', 3);
        console.log('✅ Increment operations:', { first: counter1, second: counter2 });
        // Test delete
        console.log('\n6. Testing delete operations...');
        await redis_1.default.del('test:basic');
        const deletedResult = await redis_1.default.get('test:basic');
        console.log('✅ Delete operation (should be null):', deletedResult);
        console.log('\n🎉 All Redis operations completed successfully!');
    }
    catch (error) {
        console.error('❌ Redis test failed:', error);
    }
}
// Run the test
testRedisOperations().then(() => {
    console.log('\n📊 Redis test completed. Check the results above.');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
});
