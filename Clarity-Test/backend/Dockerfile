# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/openapi.yaml ./
COPY --from=build /app/db ./db
RUN npm install --omit=dev
RUN mkdir -p data

ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_FILE=/app/data/minidrive.db

EXPOSE 4000
CMD ["node", "dist/server.js"]
