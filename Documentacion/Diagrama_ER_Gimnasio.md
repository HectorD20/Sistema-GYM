# Diagrama entidad-relacion: gimnasio

```mermaid
erDiagram
    SOCIOS ||--o{ MEMBRESIAS : contrata
    ENTRENADORES ||--o{ CLASES : imparte
    SOCIOS ||--o{ RESERVAS : realiza
    CLASES ||--o{ RESERVAS : recibe

    SOCIOS {
        int id_socio PK
        varchar nombre
        varchar correo UK
        varchar telefono
        date fecha_registro
    }
    MEMBRESIAS {
        int id_membresia PK
        int id_socio FK
        varchar tipo
        date fecha_inicio
        date fecha_fin
        numeric precio
        varchar estado
    }
    ENTRENADORES {
        int id_entrenador PK
        varchar nombre
        varchar especialidad
        varchar correo UK
        varchar telefono
        boolean activo
    }
    CLASES {
        int id_clase PK
        int id_entrenador FK
        varchar nombre
        timestamp fecha_hora
        int duracion_min
        int capacidad
    }
    RESERVAS {
        int id_reserva PK
        int id_socio FK
        int id_clase FK
        timestamp fecha_reserva
        varchar estado
    }
```

Cada reserva conecta a un socio con una clase. Un socio puede tener varios periodos de membresia; un entrenador puede impartir distintas clases. La base evita reservas repetidas para la misma combinacion de socio y clase, y la API revisa la vigencia de la membresia y el cupo al reservar.
