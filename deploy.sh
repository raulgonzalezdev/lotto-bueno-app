#!/bin/bash

echo "Building Docker images and starting containers..."

# Construir las imágenes de Docker
docker-compose build

# Iniciar los servicios en segundo plano
docker-compose up -d

# Verificar el estado de los servicios
echo "Waiting for services to become healthy..."
docker-compose ps

echo "All services are up and running."
