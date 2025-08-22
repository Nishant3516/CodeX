# --- Build Stage ---
FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/runner .

# --- Final Stage ---
# Use a distroless static image for a minimal attack surface.
FROM gcr.io/distroless/static-debian11

WORKDIR /app

# Copy the compiled binary from the builder stage.
COPY --from=builder /app/runner .

# Create a non-root user and group. Distroless images don't have user management tools,
# so we specify the user and group IDs directly.
USER 65532:65532

# The WORKSPACE_DIR environment variable will be set in the Kubernetes deployment.
# We don't need to create it here as the shared volume will be mounted at runtime.

# Expose the ports for the file system and pseudo-terminal services.
EXPOSE 8081 8082

ENTRYPOINT ["/app/runner"]