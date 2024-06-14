#!/bin/bash

# Usar un argumento para especificar el servicio a reconstruir
service_name=$1

echo "Starting Docker containers..."

if [[ -z "$service_name" ]]; then
  # Si no se especifica un servicio, levantar todos sin construir
  echo "No specific service specified. Starting all services without building..."
  docker-compose --env-file .env up -d
else
  # Construir y levantar solo el servicio especificado
  echo "Building and starting specified service: $service_name"
  docker-compose --env-file .env up -d --build $service_name
fi

# Verificar el estado de los servicios
echo "Waiting for services to become healthy..."
docker-compose ps

echo "All services are up and running."
