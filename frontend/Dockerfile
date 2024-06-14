# Base image for building
FROM node:20.13.1-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

# Production image, serve the static site
FROM node:20.13.1-alpine AS runner
WORKDIR /app
RUN yarn global add serve
COPY --from=builder /app/build_output ./public
EXPOSE 3000
CMD ["serve", "public", "-p", "3000"]

