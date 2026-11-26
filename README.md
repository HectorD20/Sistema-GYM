[README.md](https://github.com/user-attachments/files/35446418/README.md)
# Sistema de Administracion de Gimnasio

API REST para administrar socios, membresias, entrenadores, clases y reservas. Usa Node.js, Express y PostgreSQL; Swagger UI se publica en `/api-docs`.

El modelo entidad–relación actualizado se encuentra en `Diagrama_ER_Sistema_GYM.md` y como imagen en `Diagrama_ER_Sistema_GYM.png`.

## Preparacion

1. En pgAdmin crea una base separada llamada `gimnasio_db`.
2. Conecta el Query Tool a `gimnasio_db` y ejecuta `base_datos.sql` una sola vez. El script crea las cinco tablas y carga diez filas de ejemplo en cada una.
3. En PowerShell define `GYM_DB_PASSWORD` con la contrasena de PostgreSQL. Opcionalmente configura `GYM_DB_HOST`, `GYM_DB_PORT`, `GYM_DB_NAME` y `GYM_DB_USER`. La base predeterminada es `gimnasio_db`.
4. Desde esta carpeta ejecuta `npm install` si no tienes las dependencias y despues `npm start`. El gimnasio usa el puerto `3001` por defecto; puedes cambiarlo con `GYM_PORT`.
5. Abre `http://localhost:3001/api-docs` y comprueba la conexion con `http://localhost:3001/api/health`.

La configuracion `GYM_*` mantiene independiente este servicio de otras aplicaciones que usen el mismo servidor PostgreSQL. `DB_USER` y `DB_PASSWORD` se aceptan como alternativa para instalaciones locales que ya los tengan definidos.

Si `/api/health` devuelve `503`, inicia el servicio PostgreSQL y confirma que `gimnasio_db` existe, que `base_datos.sql` ya se ejecuto y que la contrasena corresponde al usuario configurado.

## Rutas

Cada recurso ofrece `GET` de coleccion, `POST`, `GET` por ID, `PUT` y `DELETE` por ID:

| Recurso | Coleccion | Por ID |
|---|---|---|
| Socios | `/api/socios` | `/api/socios/{id}` |
| Membresias | `/api/membresias` | `/api/membresias/{id}` |
| Entrenadores | `/api/entrenadores` | `/api/entrenadores/{id}` |
| Clases | `/api/clases` | `/api/clases/{id}` |
| Reservas | `/api/reservas` | `/api/reservas/{id}` |

Las reservas requieren una membresia activa que cubra la fecha de una clase futura y se rechazan cuando la clase ya alcanzo su capacidad. PostgreSQL protege llaves foraneas, correos unicos, el mismo horario de inicio por entrenador y reservas duplicadas del mismo socio en una clase.
