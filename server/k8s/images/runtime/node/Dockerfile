FROM golang:1.23-alpine AS test_runner_build

WORKDIR /src
COPY test-engine/test-runner.go ./test-runner.go
RUN go build -trimpath -ldflags="-s -w" -o /out/devsarena-test-runner ./test-runner.go

FROM node:22-alpine

RUN apk add --no-cache bash socat procps

# Create the low-privileged user
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -S appuser

# Baked test engine (Jest/Babel + configs)
ENV DEVSARENA_ENGINE_ROOT=/opt/devsarena/test-engine

WORKDIR ${DEVSARENA_ENGINE_ROOT}
COPY test-engine/package.json ./package.json
RUN npm install --no-audit --no-fund
COPY test-engine/jest.config.cjs ./jest.config.cjs
COPY test-engine/jest.setup.cjs ./jest.setup.cjs
COPY test-engine/jest.reporter.cjs ./jest.reporter.cjs
COPY test-engine/jest.empty-module.cjs ./jest.empty-module.cjs
COPY test-engine/babel.config.cjs ./babel.config.cjs

# Test runner binaries
COPY --from=test_runner_build /out/devsarena-test-runner /usr/local/bin/devsarena-test-runner
COPY test-engine/bin/test-runner-service.js /usr/local/bin/test-runner-service.js
RUN chmod +x /usr/local/bin/devsarena-test-runner /usr/local/bin/test-runner-service.js

WORKDIR /workspace

# Give appuser permission to the workspace
RUN chown appuser:appgroup /workspace

# Preserve previous behavior: include build-context files (if any) in /workspace
COPY . ./

# Drop to non-root user for all operations
USER appuser
