import Redis from 'ioredis'

const redis: Redis = new Redis(
  process.env.REDIS_URL || 'redis://localhost:6379'
)

export default redis
