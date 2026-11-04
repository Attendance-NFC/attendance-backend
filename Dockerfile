# syntax=docker/dockerfile:1
ARG NODE_VERSION=20

# Stage 1: Build the application
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /usr/src/app

# Copy dependency files and source files
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Final minimal runtime optimized for AWS Lambda
FROM public.ecr.aws/lambda/nodejs:${NODE_VERSION} AS final

# Set working directory to Lambda's preferred location
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the compiled distribution code from the build stage
COPY --from=build /usr/src/app/dist ./dist

# AWS Lambda base image automatically exposes the environment. 
# You just need to point to the handler file.
CMD [ "dist/index.handler" ]

