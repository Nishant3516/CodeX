#############################
# Stage 1: Build pty-server binary
#############################
FROM golang:1.24-alpine AS builder
# Build inside the pty module directory so the go.mod there is root
WORKDIR /workspace

# Copy module files
COPY internal/pty/go.mod go.mod
COPY internal/pty/go.sum go.sum
RUN go mod download

# Copy all pty source
COPY internal/pty .

# Create secure directory for pty binary
RUN mkdir -p /pty-service && chmod 700 /pty-service

# Build static pty-server binary to /pty-service
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /pty-service/pty-server .

#############################
# Stage 2: Node.js runtime with pty-server
#############################
FROM node:22-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

RUN apk add --no-cache bash

# Create secure directory for pty binary
RUN mkdir -p /pty-service && chmod 700 /pty-service

WORKDIR /workspace

# Copy pty-server binary into secure dir
COPY --from=builder /pty-service/pty-server /pty-service/pty-server
RUN chmod 700 /pty-service/pty-server && chown appuser:appgroup /pty-service/pty-server

# Copy React source (no build/install)
COPY src ./src
COPY public ./public
COPY index.html package.json vite.config.js .gitignore eslint.config.js README.md ./

USER root
# Copy start script into secure pty-service dir and set permissions
COPY start.sh /pty-service/start.sh
RUN chmod 700 /pty-service/start.sh && chown appuser:appgroup /pty-service/start.sh

# Switch to non-root
USER appuser

# Expose PTY WebSocket port
EXPOSE 8082 5173 3000

# Start the pty server in background and keep the container alive
ENTRYPOINT ["/pty-service/pty-server"]
