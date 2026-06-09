# Build Stage
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
RUN npm install

# Build Shared
COPY shared ./shared
WORKDIR /app/shared
RUN npm run build

# Build Frontend
WORKDIR /app
COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm run build

# Build Backend
WORKDIR /app
COPY backend ./backend
WORKDIR /app/backend
RUN npm run build

# Final Stage
FROM node:20-alpine
WORKDIR /app

# Copy ALL node_modules and built folders to keep workspace logic working
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/frontend/dist ./public

EXPOSE 80
# Run from root
CMD ["node", "backend/dist/main"]
