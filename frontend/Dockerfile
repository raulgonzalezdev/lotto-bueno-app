# Base image for building
FROM node:20.13.1-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

# Production image, copy all the files and run next
FROM node:20.13.1-alpine AS runner
WORKDIR /app

# Define the environment as production
ENV NODE_ENV production

# Create a group and user to run our app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Next.js collects completely anonymous telemetry data about general usage.
# You can learn more about this at https://nextjs.org/telemetry
# Uncomment the following line if you want to disable telemetry during production.
# ENV NEXT_TELEMETRY_DISABLED 1

# You need to copy the .next folder from your builder stage to your runner stage.
# This folder contains all of your build artifacts.
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

# Also copy the public and other directories if needed
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/styles ./styles
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Specify the user to use when running your app
USER nextjs

# Expose the port your app runs on
EXPOSE 3000

# Define the command to run your app using CMD which makes your app startable
CMD ["yarn", "start"]


