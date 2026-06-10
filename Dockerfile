# Build Stage
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

# Final Stage
FROM node:20-alpine
# better-sqlite3 may need build tools even for production install
RUN apk add --no-cache python3 make g++
WORKDIR /app

# Copy EVERYTHING needed for npm workspaces to work
COPY package*.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install only production dependencies
RUN npm install --omit=dev

# Copy built files from builder stage
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/dist ./public

# Cleanup build tools
RUN apk del python3 make g++

EXPOSE 80
# Run from root, pointing to the backend entry point
CMD ["node", "backend/dist/main"]
