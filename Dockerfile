FROM node:18-alpine

# Install bash and other dependencies
RUN apk add --no-cache bash sshpass openssh-client wget

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Ensure public directory permissions
RUN chmod -R 755 /app/public

# Create directories for database and logs
RUN mkdir -p /app/data /app/logs

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]