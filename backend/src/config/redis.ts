// backend/src/config/redis.ts

import { createClient } from 'redis'
import { config } from './index'

export const redis = config.REDIS_URL ? createClient({ url: config.REDIS_URL }) : null

redis?.on('error', err => console.error('Redis error:', err))
redis?.on('connect', () => console.log('✅ Redis connected'))

export async function connectRedis() {
  if (!redis) {
    console.warn('⚠️  REDIS_URL is not set. Risk state will use in-memory storage for this process.')
    return
  }

  if (!redis.isOpen) await redis.connect()
}
