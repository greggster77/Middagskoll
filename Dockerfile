FROM node:24-alpine
WORKDIR /app
COPY public ./public
COPY worker ./worker
COPY licenses ./licenses
COPY server.mjs package.json SOURCE.txt initial-state.json ./
ENV NODE_ENV=production HA_INGRESS_ONLY=1 HOST=0.0.0.0 PORT=8099 DATA_DIR=/data
EXPOSE 8099
CMD ["node", "server.mjs"]
