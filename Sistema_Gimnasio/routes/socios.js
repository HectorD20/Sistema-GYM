const express = require('express');
const pool = require('../db');
const { idValido, textoValido, correoValido, manejarError } = require('./_helpers');

const router = express.Router();

/**
 * @swagger
 * /api/socios:
 *   get:
 *     summary: Lista los socios
 *     tags: [Socios]
 *     responses:
 *       '200': { description: Lista de socios, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Socio' } } } } }
 *       '500': { description: Error interno del servidor }
 *   post:
 *     summary: Registra un socio
 *     tags: [Socios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SocioEntrada' }
 *           example: { nombre: 'Ana Torres', correo: 'ana.torres@example.com', telefono: '5551234567' }
 *     responses:
 *       '201': { description: Socio creado, content: { application/json: { schema: { $ref: '#/components/schemas/Socio' } } } }
 *       '400': { description: Datos faltantes o invalidos }
 *       '409': { description: El correo ya esta registrado }
 */
router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM socios ORDER BY id_socio');
    res.status(200).json(resultado.rows);
  } catch (error) { manejarError(error, res); }
});

router.post('/', async (req, res) => {
  const datos = req.body || {};
  if (!textoValido(datos.nombre, 100) || !correoValido(datos.correo) || !textoValido(datos.telefono, 20)) {
    return res.status(400).json({ error: 'nombre, correo valido y telefono son obligatorios.' });
  }
  try {
    const resultado = await pool.query(
      'INSERT INTO socios (nombre, correo, telefono) VALUES ($1, $2, $3) RETURNING *',
      [datos.nombre.trim(), datos.correo.trim().toLowerCase(), datos.telefono.trim()]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (error) { manejarError(error, res); }
});

/**
 * @swagger
 * /api/socios/{id}:
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       schema: { type: integer, minimum: 1 }
 *       description: Identificador del socio
 *   get:
 *     summary: Consulta un socio
 *     tags: [Socios]
 *     responses:
 *       '200': { description: Socio encontrado, content: { application/json: { schema: { $ref: '#/components/schemas/Socio' } } } }
 *       '400': { description: Identificador invalido }
 *       '404': { description: Socio no encontrado }
 *   put:
 *     summary: Actualiza un socio
 *     tags: [Socios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SocioEntrada' }
 *           example: { nombre: 'Ana Torres', correo: 'ana.torres@example.com', telefono: '5551234567' }
 *     responses:
 *       '200': { description: Socio actualizado }
 *       '400': { description: Identificador o datos invalidos }
 *       '404': { description: Socio no encontrado }
 *       '409': { description: Correo duplicado o socio relacionado }
 *   delete:
 *     summary: Elimina un socio sin membresias ni reservas relacionadas
 *     tags: [Socios]
 *     responses:
 *       '200': { description: Socio eliminado }
 *       '400': { description: Identificador invalido }
 *       '404': { description: Socio no encontrado }
 *       '409': { description: El socio tiene membresias o reservas }
 */
router.get('/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'El id_socio debe ser un entero positivo.' });
  try {
    const resultado = await pool.query('SELECT * FROM socios WHERE id_socio = $1', [req.params.id]);
    if (!resultado.rows.length) return res.status(404).json({ error: 'Socio no encontrado.' });
    res.status(200).json(resultado.rows[0]);
  } catch (error) { manejarError(error, res); }
});

router.put('/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'El id_socio debe ser un entero positivo.' });
  const datos = req.body || {};
  if (!textoValido(datos.nombre, 100) || !correoValido(datos.correo) || !textoValido(datos.telefono, 20)) {
    return res.status(400).json({ error: 'nombre, correo valido y telefono son obligatorios.' });
  }
  try {
    const resultado = await pool.query(
      'UPDATE socios SET nombre = $1, correo = $2, telefono = $3 WHERE id_socio = $4 RETURNING *',
      [datos.nombre.trim(), datos.correo.trim().toLowerCase(), datos.telefono.trim(), req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ error: 'Socio no encontrado.' });
    res.status(200).json(resultado.rows[0]);
  } catch (error) { manejarError(error, res); }
});

router.delete('/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'El id_socio debe ser un entero positivo.' });
  try {
    const resultado = await pool.query('DELETE FROM socios WHERE id_socio = $1 RETURNING *', [req.params.id]);
    if (!resultado.rows.length) return res.status(404).json({ error: 'Socio no encontrado.' });
    res.status(200).json({ mensaje: 'Socio eliminado.', socio: resultado.rows[0] });
  } catch (error) { manejarError(error, res); }
});

module.exports = router;
