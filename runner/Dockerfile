# --- Build Stage ---
FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/runner .

# --- Final Stage ---
# Use alpine as the base image. It's very small but includes the 'sh' shell.
FROM alpine:latest

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy the compiled binary from the builder stage.
COPY --from=builder /app/runner .

# Set the owner of the app directory to the new user
RUN chown -R appuser:appgroup /app

# Switch to the non-root user
USER appuser

# Expose the ports for the file system and pseudo-terminal services.
EXPOSE 8081

ENTRYPOINT ["/app/runner"]