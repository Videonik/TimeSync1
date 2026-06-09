# Build Stage
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
COPY shared ./shared
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
RUN npm install

# Build Shared FIRST
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
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/frontend/dist ./frontend/dist

# Install production deps for backend
WORKDIR /app/backend
RUN npm install --omit=dev

EXPOSE 3000
CMD ["node", "dist/main"]
