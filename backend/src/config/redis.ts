// backend/src/config/redis.ts

import { createClient } from 'redis'
import { config } from './index'

export const redis = createClient({ url: config.REDIS_URL })

redis.on('error', err => console.error('Redis error:', err))
redis.on('connect', () => console.log('✅ Redis connected'))

export async function connectRedis() {
  if (!redis.isOpen) await redis.connect()
}
