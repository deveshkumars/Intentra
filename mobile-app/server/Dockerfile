# Progress + Intentra HTTP server (Bun). Build from repo root:
#
#   docker build -t intentra-progress -f mobile-app/server/Dockerfile .
#
# Run:
#   docker run --rm -p 7891:7891 \
#     -v ~/.gstack:/data/gstack \
#     -v "$PWD:/repo" \
#     -e GSTACK_STATE_DIR=/data/gstack \
#     -e INTENTRA_REPO_ROOT=/repo \
#     intentra-progress
#
FROM oven/bun:1-alpine
WORKDIR /app/server
COPY mobile-app/server/package.json ./
COPY mobile-app/server/schemas ./schemas/
COPY mobile-app/server/*.ts ./
COPY mobile-app/shared /app/shared
ENV GSTACK_PROGRESS_PORT=7891
EXPOSE 7891
CMD ["bun", "run", "server.ts"]
