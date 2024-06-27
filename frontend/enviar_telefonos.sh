#!/bin/bash
for id in {4..103}
do
  curl -X DELETE https://applottobueno.com/lineas_telefonicas/$id
  echo "Eliminado ID: $id"
done
http://applottobueno.com