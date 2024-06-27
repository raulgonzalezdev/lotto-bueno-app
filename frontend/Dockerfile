# Base Node.js image
FROM node:20.13.1-alpine AS runner
WORKDIR /app

# Define the environment as production
ENV NODE_ENV production

# Create a group and user to run our app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install dependencies
# Assume that you have a package.json and yarn.lock in your repository
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile

# Copy the pre-built .next directory from your repository
COPY .next ./.next

# Copy other necessary directories such as public if you have public assets
COPY public ./public

# You may also need to copy any other files or directories that your Next.js app uses
# Example:
# COPY locales ./locales
# COPY utils ./utils

# Specify the user to use when running your app
USER nextjs

# Expose the port your app runs on
EXPOSE 3000

# Define the command to run your app using CMD which makes your app startable
CMD ["yarn", "start"]
