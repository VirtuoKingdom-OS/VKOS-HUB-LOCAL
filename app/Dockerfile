FROM node:22-bookworm-slim AS build
WORKDIR /opt/vkos/app
COPY app/package.json app/package-lock.json ./
COPY app/server/package.json server/package.json
COPY app/web/package.json web/package.json
COPY app/motor/package.json motor/package.json
RUN npm ci
COPY app/ ./
RUN npm run build -w web && npm run build -w server
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /opt/vkos/app
COPY --from=build --chown=node:node /opt/vkos/app /opt/vkos/app
COPY --chown=node:node vkos2 /opt/vkos/vkos2
USER node
EXPOSE 4600
CMD ["node", "server/dist/index.js"]

FROM runtime AS hub

FROM runtime AS core-root
USER root
RUN npm install --global @anthropic-ai/claude-code
# A pasta do Claude do CORE precisa nascer como node no build, senao o volume
# claude_core monta como root e o processo (usuario node) toma EACCES ao salvar
# o login, ficando "Not logged in" mesmo apos autenticar.
RUN mkdir -p /home/node/.claude && chown -R node:node /home/node/.claude
USER node

FROM core-root AS core
