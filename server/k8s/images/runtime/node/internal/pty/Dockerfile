#############################
# DevsArena PTY Relay Image
# Minimal Go binary: WebSocket <-> Unix socket + Redis monitoring
#############################

# Builder stage
FROM golang:1.24-alpine AS builder

WORKDIR /src

# Copy module files and download deps
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build a static binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /pty-relay .

#############################
# Runtime stage
#############################
FROM alpine:3.20

# Create non-root user for the relay
RUN addgroup -g 1000 ptygroup \
    && adduser -u 1000 -G ptygroup -S ptyuser

WORKDIR /workspace

# Copy relay binary
COPY --from=builder /pty-relay /usr/local/bin/pty-relay

USER ptyuser

EXPOSE 8082

ENTRYPOINT ["/usr/local/bin/pty-relay"]
