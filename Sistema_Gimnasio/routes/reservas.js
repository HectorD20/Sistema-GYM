const express = require('express');
const pool = require('../db');
const { idValido, enteroPositivo, manejarError } = require('./_helpers');

const router = express.Router();
const estados = ['reservada', 'cancelada'];

function validarReserva(datos) {
  return enteroPositivo(datos.id_socio) && enteroPositivo(datos.id_clase) &&
    estados.includes(datos.estado || 'reservada');
}

function enviarError(error, res) {
  if (error.status) return res.status(error.status).json({ error: error.message });
  return manejarError(error, res);
}

async function validarCupoYMembresia(client, datos, excluirReservaId) {
  const claseResult = await client.query(
    'SELECT id_clase, fecha_hora, capacidad, (fecha_hora > NOW()) AS futura FROM clases WHERE id_clase = $1 FOR UPDATE',
    [datos.id_clase]
  );
  if (!claseResult.rows.length) throw Object.assign(new Error('Clase no encontrada.'), { status: 404 });
  if (!claseResult.rows[0].futura && (datos.estado || 'reservada') === 'reservada') {
    throw Object.assign(new Error('No se pueden reservar clases que ya iniciaron.'), { status: 409 });
  }

  const socioResult = await client.query('SELECT 1 FROM socios WHERE id_socio = $1', [datos.id_socio]);
  if (!socioResult.rows.length) throw Object.assign(new Error('Socio no encontrado.'), { status: 404 });

  if ((datos.estado || 'reservada') !== 'reservada') return;

  const membresiaResult = await client.query(
    `SELECT 1
       FROM membresias
      WHERE id_socio = $1
        AND estado = 'activa'
        AND fecha_inicio <= CURRENT_DATE
        AND fecha_fin >= $2::date
      LIMIT 1`,
    [datos.id_socio, claseResult.rows[0].fecha_hora]
  );
  if (!membresiaResult.rows.length) {
    throw Object.assign(new Error('El socio necesita una membresia activa que cubra la fecha de la clase.'), { status: 409 });
  }

  const valores = [datos.id_clase];
  let exclusion = '';
  if (excluirReservaId) {
    valores.push(excluirReservaId);
    exclusion = ' AND id_reserva <> $2';
  }
  const cupoResult = await client.query(
    `SELECT COUNT(*)::int AS ocupados
       FROM reservas
      WHERE id_clase = $1 AND estado = 'reservada'${exclusion}`,
    valores
  );
  if (cupoResult.rows[0].ocupados >= claseResult.rows[0].capacidad) {
    throw Object.assign(new Error('La clase ya alcanzo su capacidad.'), { status: 409 });
  }
}

/**
 * @swagger
 * /api/reservas:
 *   get:
 *     summary: Lista las reservas
 *     tags: [Reservas]
 *     responses:
 *       '200': { description: Lista de reservas, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Reserva' } } } } }
 *   post:
 *     summary: Reserva un lugar en una clase
 *     tags: [Reservas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ReservaEntrada' }
 *           example: { id_socio: 1, id_clase: 2, estado: 'reservada' }
 *     responses:
 *       '201': { description: Lugar reservado }
 *       '400': { description: Datos invalidos }
 *       '404': { description: Socio o clase no encontrados }
 *       '409': { description: Membresia vencida, cupo lleno o reserva duplicada }
 */
router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM reservas ORDER BY id_reserva');
    res.status(200).json(resultado.rows);
  } catch (error) { manejarError(error, res); }
});

router.post('/', async (req, res) => {
  const datos = req.body || {};
  datos.estado = datos.estado || 'reservada';
  if (!validarReserva(datos)) return res.status(400).json({ error: 'id_socio, id_clase y un estado valido son obligatorios.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await validarCupoYMembresia(client, datos);
    const resultado = await client.query(
      'INSERT INTO reservas (id_socio, id_clase, estado) VALUES ($1, $2, $3) RETURNING *',
      [datos.id_socio, datos.id_clase, datos.estado]
    );
    await client.query('COMMIT');
    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    enviarError(error, res);
  } finally { client.release(); }
});

/**
 * @swagger
 * /api/reservas/{id}:
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       schema: { type: integer, minimum: 1 }
 *       description: Identificador de la reserva
 *   get:
 *     summary: Consulta una reserva
 *     tags: [Reservas]
 *     responses:
 *       '200': { description: Reserva encontrada, content: { application/json: { schema: { $ref: '#/components/schemas/Reserva' } } } }
 *       '400': { description: Identificador invalido }
 *       '404': { description: Reserva no encontrada }
 *   put:
 *     summary: Actualiza o cancela una reserva
 *     tags: [Reservas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ReservaEntrada' }
 *     responses:
 *       '200': { description: Reserva actualizada }
 *       '400': { description: Datos invalidos }
 *       '404': { description: Reserva, socio o clase no encontrados }
 *       '409': { description: Membresia vencida, cupo lleno o reserva duplicada }
 *   delete:
 *     summary: Elimina una reserva
 *     tags: [Reservas]
 *     responses:
 *       '200': { description: Reserva eliminada }
 *       '400': { description: Identificador invalido }
 *       '404': { description: Reserva no encontrada }
 */
router.get('/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'El id_reserva debe ser un entero positivo.' });
  try {
    const resultado = await pool.query('SELECT * FROM reservas WHERE id_reserva = $1', [req.params.id]);
    if (!resultado.rows.length) return res.status(404).json({ error: 'Reserva no encontrada.' });
    res.status(200).json(resultado.rows[0]);
  } catch (error) { manejarError(error, res); }
});

router.put('/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'El id_reserva debe ser un entero positivo.' });
  const datos = req.body || {};
  datos.estado = datos.estado || 'reservada';
  if (!validarReserva(datos)) return res.status(400).json({ error: 'id_socio, id_clase y un estado valido son obligatorios.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const actual = await client.query('SELECT id_reserva FROM reservas WHERE id_reserva = $1 FOR UPDATE', [req.params.id]);
    if (!actual.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Reserva no encontrada.' });
    }
    await validarCupoYMembresia(client, datos, req.params.id);
    const resultado = await client.query(
      'UPDATE reservas SET id_socio = $1, id_clase = $2, estado = $3 WHERE id_reserva = $4 RETURNING *',
      [datos.id_socio, datos.id_clase, datos.estado, req.params.id]
    );
    await client.query('COMMIT');
    res.status(200).json(resultado.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    enviarError(error, res);
  } finally { client.release(); }
});

router.delete('/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'El id_reserva debe ser un entero positivo.' });
  try {
    const resultado = await pool.query('DELETE FROM reservas WHERE id_reserva = $1 RETURNING *', [req.params.id]);
    if (!resultado.rows.length) return res.status(404).json({ error: 'Reserva no encontrada.' });
    res.status(200).json({ mensaje: 'Reserva eliminada.', reserva: resultado.rows[0] });
  } catch (error) { manejarError(error, res); }
});

module.exports = router;
