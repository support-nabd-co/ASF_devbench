FROM node:18-alpine

# Install bash and other dependencies
RUN apk add --no-cache bash sshpass openssh-client

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Create directory for database
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]