FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=development

FROM base AS dev
COPY ./app/package*.json ./
RUN npm install
EXPOSE 3000
CMD ["npm","run","dev","--","--host"]

FROM base AS builder
# Definimos variables para producción en el build
ENV NODE_ENV=production
COPY ./app/package*.json ./
# Instalamos dependencias (incluyendo devDependencies necesarias para el build)
RUN npm install --include=dev
COPY ./app .
COPY .env_prod .env

# 👇 LA CLAVE: Aumentamos el límite de memoria a 4GB (4096MB)
# Node usará la RAM física y desbordará a la Swap si es necesario.
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN npm run build

FROM node:20-alpine AS prod
ENV NODE_ENV=production
COPY --from=builder /app/.output ./.output
# Solo copiamos si es estrictamente necesario, usualmente .output ya tiene todo
# COPY --from=builder /app/node_modules ./node_modules 
EXPOSE 3000
CMD ["node",".output/server/index.mjs"]