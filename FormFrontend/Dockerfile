# Step 1: Build the app
FROM node:18 AS build

# Set the working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Set environment variables for the build process
ENV VITE_API_URL="http://localhost:3000/" 
#Enter the backend URL Here

# Build the app
RUN npm run build

# Step 2: Serve the app using a lightweight server (Nginx)
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built app from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose the port the app will run on
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]