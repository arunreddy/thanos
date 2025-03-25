FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json .

RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port Next.js runs on
EXPOSE 3000

# Start the application in development mode
CMD ["npm", "run", "dev"]
