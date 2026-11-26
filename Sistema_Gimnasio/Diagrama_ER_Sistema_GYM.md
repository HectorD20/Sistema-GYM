# Diagrama ER — Sistema GYM

Basado en Sistema_Gimnasio/base_datos.sql. Los guiones bajos representan paréntesis en los tipos Mermaid; por ejemplo, VARCHAR_100 equivale a VARCHAR(100).

```mermaid
erDiagram
    SOCIOS ||--o{ MEMBRESIAS : contrata
    SOCIOS ||--o{ RESERVAS : solicita
    ENTRENADORES ||--o{ CLASES : imparte
    CLASES ||--o{ RESERVAS : recibe
    SOCIOS {
      SERIAL id_socio PK
      VARCHAR_100 nombre
      VARCHAR_120 correo UK
      VARCHAR_20 telefono
      DATE fecha_registro
    }
    MEMBRESIAS {
      SERIAL id_membresia PK
      INT id_socio FK
      VARCHAR_30 tipo
      DATE fecha_inicio
      DATE fecha_fin
      NUMERIC_9_2 precio
      VARCHAR_12 estado
    }
    ENTRENADORES {
      SERIAL id_entrenador PK
      VARCHAR_100 nombre
      VARCHAR_80 especialidad
      VARCHAR_120 correo UK
      VARCHAR_20 telefono
      BOOLEAN activo
    }
    CLASES {
      SERIAL id_clase PK
      VARCHAR_80 nombre
      TEXT descripcion
      TIMESTAMP fecha_hora
      INT duracion_min
      INT capacidad
      INT id_entrenador FK
    }
    RESERVAS {
      SERIAL id_reserva PK
      INT id_socio FK
      INT id_clase FK
      TIMESTAMP fecha_reserva
      VARCHAR_12 estado
    }
```

Las llaves foráneas usan ON DELETE RESTRICT.
