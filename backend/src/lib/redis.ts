import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  throw new Error('Missing Upstash Redis environment variables');
}

// Create Redis client
export const redis = new Redis({
  url: redisUrl,
  token: redisToken,
});

// Helper function to test Redis connection
export async function testRedisConnection(): Promise<boolean> {
  try {
    const testKey = 'test:connection';
    const testValue = 'MoltDin';

    // Set a test value
    await redis.set(testKey, testValue, { ex: 10 }); // Expires in 10 seconds

    // Get the test value
    const result = await redis.get(testKey);

    if (result === testValue) {
      console.log('✅ Redis connection successful');
      // Clean up
      await redis.del(testKey);
      return true;
    } else {
      console.error('Redis connection test failed: value mismatch');
      return false;
    }
  } catch (error) {
    console.error('Redis connection failed:', error);
    return false;
  }
}
