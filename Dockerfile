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

# Install build tools temporarily for production install
RUN apk add --no-cache python3 make g++

# Copy built assets to a FLAT structure in the final image
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/package*.json ./
COPY --from=builder /app/frontend/dist ./public
COPY --from=builder /app/package*.json ./

# Install ONLY production dependencies
RUN npm install --omit=dev && apk del python3 make g++

EXPOSE 80
CMD ["node", "dist/main"]
