# Progress + Intentra HTTP server (Bun). Mount gstack state and repo for full behavior.
#
# Build:  docker build -t intentra-progress -f Dockerfile .
# Run:    docker run --rm -p 7891:7891 \
#           -v ~/.gstack:/data/gstack \
#           -v "$PWD:/repo" \
#           -e GSTACK_STATE_DIR=/data/gstack \
#           -e INTENTRA_REPO_ROOT=/repo \
#           intentra-progress
#
FROM oven/bun:1-alpine
WORKDIR /app
COPY package.json ./
COPY server.ts intent.ts culture.ts guard.ts guard-types.ts guard-command.ts guard-policy.ts ./
ENV GSTACK_PROGRESS_PORT=7891
EXPOSE 7891
CMD ["bun", "run", "server.ts"]
