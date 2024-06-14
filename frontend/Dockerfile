# Use the base Node.js image from Docker Hub
FROM node:20.13.1-alpine AS runner
WORKDIR /app

# Define the environment as production
ENV NODE_ENV production

# Create a group and user to run our app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# You might want to disable Next.js telemetry for production.
# ENV NEXT_TELEMETRY_DISABLED 1

# Copy the .next directory and other necessary files
COPY .next ./.next
COPY public ./public
COPY styles ./styles
COPY node_modules ./node_modules
COPY package.json ./package.json

# Specify the user to use when running your app
USER nextjs

# Expose the port your app runs on
EXPOSE 3000

# Define the command to run your app using CMD which makes your app startable
CMD ["yarn", "start"]
