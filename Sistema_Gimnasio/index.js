
const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const rutasSocios = require('./routes/socios');
const rutasMembresias = require('./routes/membresias');
const rutasEntrenadores = require('./routes/entrenadores');
const rutasClases = require('./routes/clases');
const rutasReservas = require('./routes/reservas');
const pool = require('./db');

const app = express();
const puerto = Number(process.env.GYM_PORT || 3001);

const swaggerOptions = {
  failOnErrors: true,
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sistema de Administracion de Gimnasio',
      version: '1.0.0',
      description: 'API REST para administrar socios, membresias, entrenadores, clases y reservas.'
    },
    servers: [{ url: `http://localhost:${puerto}`, description: 'Servidor local' }],
    tags: [
      { name: 'Socios', description: 'Registro de clientes del gimnasio' },
      { name: 'Membresias', description: 'Vigencia y tipo de membresia de cada socio' },
      { name: 'Entrenadores', description: 'Directorio de entrenadores' },
      { name: 'Clases', description: 'Calendario y capacidad de las clases' },
      { name: 'Reservas', description: 'Inscripcion de socios a clases' }
    ],
    components: {
      schemas: {
        SocioEntrada: {
          type: 'object', required: ['nombre', 'correo', 'telefono'],
          properties: {
            nombre: { type: 'string', maxLength: 100, example: 'Ana Torres' },
            correo: { type: 'string', format: 'email', maxLength: 120, example: 'ana.torres@example.com' },
            telefono: { type: 'string', maxLength: 20, example: '5551234567' }
          }
        },
        Socio: { allOf: [{ $ref: '#/components/schemas/SocioEntrada' }, { type: 'object', properties: {
          id_socio: { type: 'integer', readOnly: true, example: 11 },
          fecha_registro: { type: 'string', format: 'date', readOnly: true }
        } }] },
        MembresiaEntrada: {
          type: 'object', required: ['id_socio', 'tipo', 'fecha_inicio', 'fecha_fin', 'precio', 'estado'],
          properties: {
            id_socio: { type: 'integer', minimum: 1, example: 1 },
            tipo: { type: 'string', maxLength: 30, example: 'Mensual' },
            fecha_inicio: { type: 'string', format: 'date', example: '2026-11-23' },
            fecha_fin: { type: 'string', format: 'date', example: '2026-12-22' },
            precio: { type: 'number', minimum: 0, example: 650 },
            estado: { type: 'string', enum: ['activa', 'vencida', 'cancelada'], example: 'activa' }
          }
        },
        Membresia: { allOf: [{ $ref: '#/components/schemas/MembresiaEntrada' }, { type: 'object', properties: {
          id_membresia: { type: 'integer', readOnly: true, example: 11 }
        } }] },
        EntrenadorEntrada: {
          type: 'object', required: ['nombre', 'especialidad', 'correo', 'telefono', 'activo'],
          properties: {
            nombre: { type: 'string', maxLength: 100, example: 'Marco Ruiz' },
            especialidad: { type: 'string', maxLength: 80, example: 'Entrenamiento funcional' },
            correo: { type: 'string', format: 'email', maxLength: 120, example: 'marco.ruiz@example.com' },
            telefono: { type: 'string', maxLength: 20, example: '5559876543' },
            activo: { type: 'boolean', example: true }
          }
        },
        Entrenador: { allOf: [{ $ref: '#/components/schemas/EntrenadorEntrada' }, { type: 'object', properties: {
          id_entrenador: { type: 'integer', readOnly: true, example: 11 }
        } }] },
        ClaseEntrada: {
          type: 'object', required: ['nombre', 'descripcion', 'fecha_hora', 'duracion_min', 'capacidad', 'id_entrenador'],
          properties: {
            nombre: { type: 'string', maxLength: 80, example: 'HIIT matutino' },
            descripcion: { type: 'string', example: 'Circuito de intervalos de alta intensidad.' },
            fecha_hora: { type: 'string', format: 'date-time', example: '2026-12-18T07:00:00' },
            duracion_min: { type: 'integer', minimum: 1, example: 45 },
            capacidad: { type: 'integer', minimum: 1, example: 18 },
            id_entrenador: { type: 'integer', minimum: 1, example: 2 }
          }
        },
        Clase: { allOf: [{ $ref: '#/components/schemas/ClaseEntrada' }, { type: 'object', properties: {
          id_clase: { type: 'integer', readOnly: true, example: 11 }
        } }] },
        ReservaEntrada: {
          type: 'object', required: ['id_socio', 'id_clase'],
          properties: {
            id_socio: { type: 'integer', minimum: 1, example: 1 },
            id_clase: { type: 'integer', minimum: 1, example: 2 },
            estado: { type: 'string', enum: ['reservada', 'cancelada'], default: 'reservada', example: 'reservada' }
          }
        },
        Reserva: { allOf: [{ $ref: '#/components/schemas/ReservaEntrada' }, { type: 'object', properties: {
          id_reserva: { type: 'integer', readOnly: true, example: 11 },
          fecha_reserva: { type: 'string', format: 'date-time', readOnly: true }
        } }] },
        Error: { type: 'object', properties: { error: { type: 'string', example: 'Registro no encontrado.' } } }
      }
    }
  },
  apis: [path.join(__dirname, 'routes', '*.js').replace(/\\/g, '/')]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use(cors());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (req, res) => {
  res.json({ mensaje: 'API del sistema de administracion de gimnasio' });
});

app.get('/api/health', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT current_database() AS database');
    res.status(200).json({ estado: 'ok', sistema: 'gimnasio', base_datos: resultado.rows[0].database });
  } catch (error) {
    console.error('No se pudo conectar con la base de datos del gimnasio:', error.message);
    res.status(503).json({ estado: 'error', sistema: 'gimnasio', error: 'No hay conexion con gimnasio_db.' });
  }
});

app.use('/api/socios', rutasSocios);
app.use('/api/membresias', rutasMembresias);
app.use('/api/entrenadores', rutasEntrenadores);
app.use('/api/clases', rutasClases);
app.use('/api/reservas', rutasReservas);

app.listen(puerto, () => {
  console.log(`Servidor iniciado en http://localhost:${puerto}`);
});
