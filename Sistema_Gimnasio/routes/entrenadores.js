const express = require('express');
const pool = require('../db');
const { idValido, textoValido, correoValido, manejarError } = require('./_helpers');

const router = express.Router();

function validarEntrenador(datos) {
  return textoValido(datos.nombre, 100) && textoValido(datos.especialidad, 80) &&
    correoValido(datos.correo) && textoValido(datos.telefono, 20) && typeof datos.activo === 'boolean';
}

/**
 * @swagger
 * /api/entrenadores:
 *   get:
 *     summary: Lista los entrenadores
 *     tags: [Entrenadores]
 *     responses:
 *       '200': { description: Lista de entrenadores, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Entrenador' } } } } }
 *   post:
 *     summary: Registra un entrenador
 *     tags: [Entrenadores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/EntrenadorEntrada' }
 *           example: { nombre: 'Marco Ruiz', especialidad: 'Entrenamiento funcional', correo: 'marco.ruiz@example.com', telefono: '5559876543', activo: true }
 *     responses:
 *       '201': { description: Entrenador creado }
 *       '400': { description: Datos faltantes o invalidos }
 *       '409': { description: El correo ya esta registrado }
 */
router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM entrenadores ORDER BY id_entrenador');
    res.status(200).json(resultado.rows);
  } catch (error) { manejarError(error, res); }
});

router.post('/', async (req, res) => {
  const datos = req.body || {};
  if (!validarEntrenador(datos)) return res.status(400).json({ error: 'nombre, especialidad, correo, telefono y activo son obligatorios.' });
  try {
    const resultado = await pool.query(
      `INSERT INTO entrenadores (nombre, especialidad, correo, telefono, activo)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [datos.nombre.trim(), datos.especialidad.trim(), datos.correo.trim().toLowerCase(), datos.telefono.trim(), datos.activo]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (error) { manejarError(error, res); }
});

/**
 * @swagger
 * /api/entrenadores/{id}:
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       schema: { type: integer, minimum: 1 }
 *       description: Identificador del entrenador
 *   get:
 *     summary: Consulta un entrenador
 *     tags: [Entrenadores]
 *     responses:
 *       '200': { description: Entrenador encontrado, content: { application/json: { schema: { $ref: '#/components/schemas/Entrenador' } } } }
 *       '400': { description: Identificador invalido }
 *       '404': { description: Entrenador no encontrado }
 *   put:
 *     summary: Actualiza un entrenador
 *     tags: [Entrenadores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/EntrenadorEntrada' }
 *     responses:
 *       '200': { description: Entrenador actualizado }
 *       '400': { description: Datos invalidos }
 *       '404': { description: Entrenador no encontrado }
 *       '409': { description: Correo duplicado o entrenador con clases }
 *   delete:
 *     summary: Elimina un entrenador sin clases relacionadas
 *     tags: [Entrenadores]
 *     responses:
 *       '200': { description: Entrenador eliminado }
 *       '400': { description: Identificador invalido }
 *       '404': { description: Entrenador no encontrado }
 *       '409': { description: El entrenador tiene clases }
 */
router.get('/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'El id_entrenador debe ser un entero positivo.' });
  try {
    const resultado = await pool.query('SELECT * FROM entrenadores WHERE id_entrenador = $1', [req.params.id]);
    if (!resultado.rows.length) return res.status(404).json({ error: 'Entrenador no encontrado.' });
    res.status(200).json(resultado.rows[0]);
  } catch (error) { manejarError(error, res); }
});

router.put('/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'El id_entrenador debe ser un entero positivo.' });
  const datos = req.body || {};
  if (!validarEntrenador(datos)) return res.status(400).json({ error: 'nombre, especialidad, correo, telefono y activo son obligatorios.' });
  try {
    const resultado = await pool.query(
      `UPDATE entrenadores
          SET nombre = $1, especialidad = $2, correo = $3, telefono = $4, activo = $5
        WHERE id_entrenador = $6 RETURNING *`,
      [datos.nombre.trim(), datos.especialidad.trim(), datos.correo.trim().toLowerCase(), datos.telefono.trim(), datos.activo, req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ error: 'Entrenador no encontrado.' });
    res.status(200).json(resultado.rows[0]);
  } catch (error) { manejarError(error, res); }
});

router.delete('/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'El id_entrenador debe ser un entero positivo.' });
  try {
    const resultado = await pool.query('DELETE FROM entrenadores WHERE id_entrenador = $1 RETURNING *', [req.params.id]);
    if (!resultado.rows.length) return res.status(404).json({ error: 'Entrenador no encontrado.' });
    res.status(200).json({ mensaje: 'Entrenador eliminado.', entrenador: resultado.rows[0] });
  } catch (error) { manejarError(error, res); }
});

module.exports = router;
