### Dockerfile for Node.js lab image
# Multi-stage pattern: build step (optional) then runtime with non-root user.

FROM node:18-bullseye AS builder
WORKDIR /work

# Install build deps if native modules are present
RUN apt-get update && apt-get install -y --no-install-recommends build-essential python3 ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* /work/
RUN npm ci --production

COPY . /work/

FROM node:18-bullseye-slim
ENV NODE_ENV=production

RUN groupadd -r lms && useradd -r -g lms -m -d /home/lms lms

WORKDIR /app
COPY --from=builder /work /app
RUN chown -R lms:lms /app
USER lms

EXPOSE 8080
CMD ["node", "/app/runner-service.js"]
