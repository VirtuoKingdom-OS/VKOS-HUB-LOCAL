FROM node:22-bookworm-slim AS build
WORKDIR /opt/vkos/app
COPY app/package.json app/package-lock.json ./
COPY app/server/package.json server/package.json
COPY app/web/package.json web/package.json
COPY app/motor/package.json motor/package.json
RUN npm ci
COPY app/motor ./motor
RUN npm run build -w motor
RUN npm prune --omit=dev

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /opt/vkos/app
COPY --from=build --chown=node:node /opt/vkos/app/node_modules ./node_modules
COPY --from=build --chown=node:node /opt/vkos/app/motor ./motor
USER node
EXPOSE 4700
CMD ["node", "motor/dist/index.js"]
