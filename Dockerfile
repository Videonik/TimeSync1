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

# Copy built assets
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/package*.json ./

# Install ONLY production dependencies at the root
# This will include dependencies needed for the backend to run
RUN npm install --omit=dev

EXPOSE 3000
CMD ["node", "backend/dist/main"]
