package redis

import (
	"context"
	"log"
	"os"

	"github.com/redis/go-redis/v9"
)

// Global Redis client instance
var RedisClient *redis.Client
var Context context.Context

func InitRedis() {
	redisURI := os.Getenv("REDIS_URI")
	opt, err := redis.ParseURL(redisURI)
	if err != nil {
		panic(err)
	}

	RedisClient = redis.NewClient(opt)
	Context = context.Background()

	// Test connection
	res, err := RedisClient.Ping(Context).Result()
	log.Printf("Redis Ping Response: %v", res)
	if err != nil {
		panic(err)
	}

	log.Println("Redis connection established")

}
