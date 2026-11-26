-- Sistema de Administracion de Gimnasio
-- Antes de ejecutar este archivo, crea gimnasio_db en pgAdmin y conectate a esa base.
-- Ejecutar una sola vez sobre una base vacia.

CREATE TABLE socios (
    id_socio       SERIAL PRIMARY KEY,
    nombre         VARCHAR(100) NOT NULL,
    correo         VARCHAR(120) NOT NULL UNIQUE,
    telefono       VARCHAR(20)  NOT NULL,
    fecha_registro DATE         NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT ck_socios_nombre CHECK (LENGTH(TRIM(nombre)) > 0),
    CONSTRAINT ck_socios_correo CHECK (correo ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

-- Una fila de membresias representa un periodo contratado por un socio.
CREATE TABLE membresias (
    id_membresia SERIAL PRIMARY KEY,
    id_socio     INT          NOT NULL,
    tipo         VARCHAR(30)  NOT NULL,
    fecha_inicio DATE         NOT NULL,
    fecha_fin    DATE         NOT NULL,
    precio       NUMERIC(9,2) NOT NULL,
    estado       VARCHAR(12)  NOT NULL DEFAULT 'activa',
    CONSTRAINT fk_membresias_socio FOREIGN KEY (id_socio)
        REFERENCES socios (id_socio) ON DELETE RESTRICT,
    CONSTRAINT ck_membresias_tipo CHECK (LENGTH(TRIM(tipo)) > 0),
    CONSTRAINT ck_membresias_fechas CHECK (fecha_fin >= fecha_inicio),
    CONSTRAINT ck_membresias_precio CHECK (precio >= 0),
    CONSTRAINT ck_membresias_estado CHECK (estado IN ('activa', 'vencida', 'cancelada'))
);

CREATE TABLE entrenadores (
    id_entrenador SERIAL PRIMARY KEY,
    nombre        VARCHAR(100) NOT NULL,
    especialidad  VARCHAR(80)  NOT NULL,
    correo        VARCHAR(120) NOT NULL UNIQUE,
    telefono      VARCHAR(20)  NOT NULL,
    activo        BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_entrenadores_nombre CHECK (LENGTH(TRIM(nombre)) > 0),
    CONSTRAINT ck_entrenadores_correo CHECK (correo ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

CREATE TABLE clases (
    id_clase      SERIAL PRIMARY KEY,
    nombre        VARCHAR(80) NOT NULL,
    descripcion   TEXT        NOT NULL,
    fecha_hora    TIMESTAMP   NOT NULL,
    duracion_min  INT         NOT NULL,
    capacidad     INT         NOT NULL,
    id_entrenador INT         NOT NULL,
    CONSTRAINT fk_clases_entrenador FOREIGN KEY (id_entrenador)
        REFERENCES entrenadores (id_entrenador) ON DELETE RESTRICT,
    CONSTRAINT uq_clases_entrenador_horario UNIQUE (id_entrenador, fecha_hora),
    CONSTRAINT ck_clases_duracion CHECK (duracion_min > 0),
    CONSTRAINT ck_clases_capacidad CHECK (capacidad > 0),
    CONSTRAINT ck_clases_nombre CHECK (LENGTH(TRIM(nombre)) > 0)
);

CREATE TABLE reservas (
    id_reserva    SERIAL PRIMARY KEY,
    id_socio      INT         NOT NULL,
    id_clase      INT         NOT NULL,
    fecha_reserva TIMESTAMP   NOT NULL DEFAULT NOW(),
    estado        VARCHAR(12) NOT NULL DEFAULT 'reservada',
    CONSTRAINT fk_reservas_socio FOREIGN KEY (id_socio)
        REFERENCES socios (id_socio) ON DELETE RESTRICT,
    CONSTRAINT fk_reservas_clase FOREIGN KEY (id_clase)
        REFERENCES clases (id_clase) ON DELETE RESTRICT,
    CONSTRAINT uq_reservas_socio_clase UNIQUE (id_socio, id_clase),
    CONSTRAINT ck_reservas_estado CHECK (estado IN ('reservada', 'cancelada'))
);

-- DATOS DE EJEMPLO: 10 filas por tabla.
INSERT INTO socios (nombre, correo, telefono) VALUES
('Ana Torres', 'ana.torres@example.com', '5551001001'),
('Luis Mendoza', 'luis.mendoza@example.com', '5551001002'),
('Sofia Ramirez', 'sofia.ramirez@example.com', '5551001003'),
('Diego Herrera', 'diego.herrera@example.com', '5551001004'),
('Valeria Cruz', 'valeria.cruz@example.com', '5551001005'),
('Jorge Salas', 'jorge.salas@example.com', '5551001006'),
('Camila Ortiz', 'camila.ortiz@example.com', '5551001007'),
('Mateo Flores', 'mateo.flores@example.com', '5551001008'),
('Elena Rojas', 'elena.rojas@example.com', '5551001009'),
('Pablo Navarro', 'pablo.navarro@example.com', '5551001010');

INSERT INTO membresias (id_socio, tipo, fecha_inicio, fecha_fin, precio, estado) VALUES
(1, 'Anual', '2026-01-01', '2027-01-01', 6200.00, 'activa'),
(2, 'Mensual', '2026-11-01', '2026-12-31', 650.00, 'activa'),
(3, 'Trimestral', '2026-10-01', '2027-01-01', 1750.00, 'activa'),
(4, 'Mensual', '2026-11-10', '2026-12-31', 650.00, 'activa'),
(5, 'Semestral', '2026-07-01', '2027-01-01', 3400.00, 'activa'),
(6, 'Mensual', '2026-11-15', '2026-12-15', 650.00, 'activa'),
(7, 'Trimestral', '2026-09-01', '2026-12-31', 1750.00, 'activa'),
(8, 'Anual', '2026-05-01', '2027-05-01', 6200.00, 'activa'),
(9, 'Mensual', '2026-11-20', '2026-12-20', 650.00, 'activa'),
(10, 'Semestral', '2026-08-01', '2027-02-01', 3400.00, 'activa');

INSERT INTO entrenadores (nombre, especialidad, correo, telefono, activo) VALUES
('Marco Ruiz', 'Entrenamiento funcional', 'marco.ruiz@example.com', '5552002001', TRUE),
('Laura Vega', 'Yoga', 'laura.vega@example.com', '5552002002', TRUE),
('Carlos Leon', 'Ciclismo indoor', 'carlos.leon@example.com', '5552002003', TRUE),
('Fernanda Paz', 'Pilates', 'fernanda.paz@example.com', '5552002004', TRUE),
('Ricardo Mora', 'Musculacion', 'ricardo.mora@example.com', '5552002005', TRUE),
('Natalia Gil', 'Boxeo', 'natalia.gil@example.com', '5552002006', TRUE),
('Andres Luna', 'Natacion', 'andres.luna@example.com', '5552002007', TRUE),
('Paola Ibarra', 'Baile fitness', 'paola.ibarra@example.com', '5552002008', TRUE),
('Gabriel Soto', 'Movilidad', 'gabriel.soto@example.com', '5552002009', TRUE),
('Miriam Cano', 'Entrenamiento de fuerza', 'miriam.cano@example.com', '5552002010', TRUE);

INSERT INTO clases (nombre, descripcion, fecha_hora, duracion_min, capacidad, id_entrenador) VALUES
('Circuito funcional', 'Trabajo por estaciones para todo el cuerpo.', '2026-12-10 07:00', 45, 20, 1),
('Yoga matutino', 'Sesion de movilidad, equilibrio y respiracion.', '2026-12-10 08:00', 60, 18, 2),
('Ciclismo indoor', 'Clase guiada de resistencia en bicicleta fija.', '2026-12-10 18:00', 45, 20, 3),
('Pilates inicial', 'Ejercicios de control postural y fuerza central.', '2026-12-11 09:00', 50, 16, 4),
('Fuerza basica', 'Rutina para aprender movimientos con pesas.', '2026-12-11 17:00', 55, 16, 5),
('Boxeo recreativo', 'Tecnica y acondicionamiento sin contacto.', '2026-12-12 10:00', 45, 14, 6),
('Natacion tecnica', 'Practica de tecnica y resistencia en alberca.', '2026-12-12 11:00', 50, 12, 7),
('Baile fitness', 'Rutina cardiovascular con coreografias sencillas.', '2026-12-13 09:00', 45, 22, 8),
('Movilidad y estiramiento', 'Sesion suave para mejorar el rango de movimiento.', '2026-12-13 11:00', 40, 18, 9),
('Fuerza intermedia', 'Entrenamiento de fuerza con progresiones.', '2026-12-14 08:00', 60, 14, 10);

INSERT INTO reservas (id_socio, id_clase, estado) VALUES
(1, 1, 'reservada'),
(2, 2, 'reservada'),
(3, 3, 'reservada'),
(4, 4, 'reservada'),
(5, 5, 'reservada'),
(6, 6, 'reservada'),
(7, 7, 'reservada'),
(8, 8, 'reservada'),
(9, 9, 'reservada'),
(10, 10, 'reservada');

-- Consultas para comprobar las tablas.
SELECT * FROM socios ORDER BY id_socio;
SELECT * FROM membresias ORDER BY id_membresia;
SELECT * FROM entrenadores ORDER BY id_entrenador;
SELECT * FROM clases ORDER BY id_clase;
SELECT * FROM reservas ORDER BY id_reserva;
