# Variables
POSTGRES_CONTAINER=postgres_db
REDIS_CONTAINER=redis_db
POSTGRES_PORT=11223
REDIS_PORT=6379
POSTGRES_PASSWORD=postgres

# Start PostgreSQL
postgres:
	@docker run --name $(POSTGRES_CONTAINER) \
	-e POSTGRES_PASSWORD=$(POSTGRES_PASSWORD) \
	-p $(POSTGRES_PORT):5432 -d postgres:latest

# Start Redis
redis:
	@docker run --name $(REDIS_CONTAINER) \
	-p $(REDIS_PORT):6379 -d redis:latest

# Stop and Remove Containers
clean:
	@docker rm -f $(POSTGRES_CONTAINER) $(REDIS_CONTAINER) || true

# Start All
start: postgres redis

# Stop All
stop:
	docker stop $(POSTGRES_CONTAINER) $(REDIS_CONTAINER)

# Reset All
reset: clean start

# Restart All
restart: clean start
