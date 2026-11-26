const express = require('express');
const pool = require('../db');
const { idValido, enteroPositivo, textoValido, fechaValida, manejarError } = require('./_helpers');

const router = express.Router();

function validarClase(datos) {
  return textoValido(datos.nombre, 80) && textoValido(datos.descripcion) &&
    fechaValida(datos.fecha_hora) && Date.parse(datos.fecha_hora) > Date.now() && enteroPositivo(datos.duracion_min) &&
    enteroPositivo(datos.capacidad) && enteroPositivo(datos.id_entrenador);
}

async function validarEntrenadorActivo(idEntrenador) {
  const resultado = await pool.query('SELECT activo FROM entrenadores WHERE id_entrenador = $1', [idEntrenador]);
  if (!resultado.rows.length) return { status: 404, error: 'Entrenador no encontrado.' };
  if (!resultado.rows[0].activo) return { status: 409, error: 'El entrenador esta inactivo.' };
  return null;
}

/**
 * @swagger
 * /api/clases:
 *   get:
 *     summary: Lista las clases programadas
 *     tags: [Clases]
 *     responses:
 *       '200': { description: Lista de clases, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Clase' } } } } }
 *   post:
 *     summary: Programa una clase
 *     tags: [Clases]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ClaseEntrada' }
 *           example: { nombre: 'HIIT matutino', descripcion: 'Circuito de intervalos.', fecha_hora: '2026-12-18T07:00:00', duracion_min: 45, capacidad: 18, id_entrenador: 2 }
 *     responses:
 *       '201': { description: Clase creada }
 *       '400': { description: Datos invalidos }
 *       '409': { description: Entrenador inactivo o ya tiene una clase a la misma hora de inicio }
 */
router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM clases ORDER BY fecha_hora, id_clase');
    res.status(200).json(resultado.rows);
  } catch (error) { manejarError(error, res); }
});

router.post('/', async (req, res) => {
  const datos = req.body || {};
  if (!validarClase(datos)) return res.status(400).json({ error: 'nombre, descripcion, fecha_hora futura, duracion_min, capacidad e id_entrenador son obligatorios.' });
  try {
    const errorEntrenador = await validarEntrenadorActivo(datos.id_entrenador);
    if (errorEntrenador) return res.status(errorEntrenador.status).json({ error: errorEntrenador.error });
    const resultado = await pool.query(
      `INSERT INTO clases (nombre, descripcion, fecha_hora, duracion_min, capacidad, id_entrenador)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [datos.nombre.trim(), datos.descripcion.trim(), datos.fecha_hora, Number(datos.duracion_min), Number(datos.capacidad), Number(datos.id_entrenador)]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (error) { manejarError(error, res); }
});

/**
 * @swagger
 * /api/clases/{id}:
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       schema: { type: integer, minimum: 1 }
 *       description: Identificador de la clase
 *   get:
 *     summary: Consulta una clase
 *     tags: [Clases]
 *     responses:
 *       '200': { description: Clase encontrada, content: { application/json: { schema: { $ref: '#/components/schemas/Clase' } } } }
 *       '400': { description: Identificador invalido }
 *       '404': { description: Clase no encontrada }
 *   put:
 *     summary: Actualiza una clase
 *     tags: [Clases]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ClaseEntrada' }
 *     responses:
 *       '200': { description: Clase actualizada }
 *       '400': { description: Datos invalidos }
 *       '404': { description: Clase no encontrada }
 *       '409': { description: Entrenador inactivo, hora de inicio ocupada o capacidad menor que las reservas }
 *   delete:
 *     summary: Elimina una clase sin reservas relacionadas
 *     tags: [Clases]
 *     responses:
 *       '200': { description: Clase eliminada }
 *       '400': { description: Identificador invalido }
 *       '404': { description: Clase no encontrada }
 *       '409': { description: La clase tiene reservas }
 */
router.get('/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'El id_clase debe ser un entero positivo.' });
  try {
    const resultado = await pool.query('SELECT * FROM clases WHERE id_clase = $1', [req.params.id]);
    if (!resultado.rows.length) return res.status(404).json({ error: 'Clase no encontrada.' });
    res.status(200).json(resultado.rows[0]);
  } catch (error) { manejarError(error, res); }
});

router.put('/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'El id_clase debe ser un entero positivo.' });
  const datos = req.body || {};
  if (!validarClase(datos)) return res.status(400).json({ error: 'nombre, descripcion, fecha_hora futura, duracion_min, capacidad e id_entrenador son obligatorios.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const entrenador = await client.query('SELECT activo FROM entrenadores WHERE id_entrenador = $1 FOR SHARE', [datos.id_entrenador]);
    if (!entrenador.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Entrenador no encontrado.' });
    }
    if (!entrenador.rows[0].activo) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'El entrenador esta inactivo.' });
    }
    const actual = await client.query('SELECT id_clase FROM clases WHERE id_clase = $1 FOR UPDATE', [req.params.id]);
    if (!actual.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Clase no encontrada.' });
    }
    const ocupacion = await client.query(
      `SELECT COUNT(*)::int AS reservadas
         FROM reservas
        WHERE id_clase = $1 AND estado = 'reservada'`,
      [req.params.id]
    );
    if (ocupacion.rows[0].reservadas > Number(datos.capacidad)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'La nueva capacidad es menor que las reservas existentes.' });
    }
    const resultado = await client.query(
      `UPDATE clases
          SET nombre = $1, descripcion = $2, fecha_hora = $3, duracion_min = $4, capacidad = $5, id_entrenador = $6
        WHERE id_clase = $7 RETURNING *`,
      [datos.nombre.trim(), datos.descripcion.trim(), datos.fecha_hora, Number(datos.duracion_min), Number(datos.capacidad), Number(datos.id_entrenador), req.params.id]
    );
    await client.query('COMMIT');
    res.status(200).json(resultado.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    manejarError(error, res);
  } finally { client.release(); }
});

router.delete('/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'El id_clase debe ser un entero positivo.' });
  try {
    const resultado = await pool.query('DELETE FROM clases WHERE id_clase = $1 RETURNING *', [req.params.id]);
    if (!resultado.rows.length) return res.status(404).json({ error: 'Clase no encontrada.' });
    res.status(200).json({ mensaje: 'Clase eliminada.', clase: resultado.rows[0] });
  } catch (error) { manejarError(error, res); }
});

module.exports = router;
