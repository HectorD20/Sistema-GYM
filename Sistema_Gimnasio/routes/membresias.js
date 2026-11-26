const express = require('express');
const pool = require('../db');
const { idValido, enteroPositivo, textoValido, fechaValida, manejarError } = require('./_helpers');

const router = express.Router();
const estados = ['activa', 'vencida', 'cancelada'];

function validarMembresia(datos) {
  const precio = Number(datos.precio);
  return enteroPositivo(datos.id_socio) && textoValido(datos.tipo, 30) &&
    fechaValida(datos.fecha_inicio) && fechaValida(datos.fecha_fin) &&
    datos.fecha_fin.slice(0, 10) >= datos.fecha_inicio.slice(0, 10) &&
    Number.isFinite(precio) && precio >= 0 && estados.includes(datos.estado);
}

/**
 * @swagger
 * /api/membresias:
 *   get:
 *     summary: Lista los periodos de membresia
 *     tags: [Membresias]
 *     responses:
 *       '200': { description: Lista de membresias, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Membresia' } } } } }
 *   post:
 *     summary: Registra una membresia para un socio
 *     tags: [Membresias]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/MembresiaEntrada' }
 *           example: { id_socio: 1, tipo: 'Mensual', fecha_inicio: '2026-11-23', fecha_fin: '2026-12-22', precio: 650, estado: 'activa' }
 *     responses:
 *       '201': { description: Membresia creada }
 *       '400': { description: Datos invalidos o fin anterior al inicio }
 *       '409': { description: Socio inexistente }
 */
router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM membresias ORDER BY id_membresia');
    res.status(200).json(resultado.rows);
  } catch (error) { manejarError(error, res); }
});

router.post('/', async (req, res) => {
  const datos = req.body || {};
  if (!validarMembresia(datos)) return res.status(400).json({ error: 'Revisa socio, tipo, fechas, precio y estado de la membresia.' });
  try {
    const resultado = await pool.query(
      `INSERT INTO membresias (id_socio, tipo, fecha_inicio, fecha_fin, precio, estado)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [datos.id_socio, datos.tipo.trim(), datos.fecha_inicio, datos.fecha_fin, Number(datos.precio), datos.estado]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (error) { manejarError(error, res); }
});

/**
 * @swagger
 * /api/membresias/{id}:
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       schema: { type: integer, minimum: 1 }
 *       description: Identificador de la membresia
 *   get:
 *     summary: Consulta una membresia
 *     tags: [Membresias]
 *     responses:
 *       '200': { description: Membresia encontrada, content: { application/json: { schema: { $ref: '#/components/schemas/Membresia' } } } }
 *       '400': { description: Identificador invalido }
 *       '404': { description: Membresia no encontrada }
 *   put:
 *     summary: Actualiza una membresia
 *     tags: [Membresias]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/MembresiaEntrada' }
 *     responses:
 *       '200': { description: Membresia actualizada }
 *       '400': { description: Datos invalidos }
 *       '404': { description: Membresia no encontrada }
 *       '409': { description: Socio inexistente }
 *   delete:
 *     summary: Elimina una membresia
 *     tags: [Membresias]
 *     responses:
 *       '200': { description: Membresia eliminada }
 *       '400': { description: Identificador invalido }
 *       '404': { description: Membresia no encontrada }
 */
router.get('/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'El id_membresia debe ser un entero positivo.' });
  try {
    const resultado = await pool.query('SELECT * FROM membresias WHERE id_membresia = $1', [req.params.id]);
    if (!resultado.rows.length) return res.status(404).json({ error: 'Membresia no encontrada.' });
    res.status(200).json(resultado.rows[0]);
  } catch (error) { manejarError(error, res); }
});

router.put('/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'El id_membresia debe ser un entero positivo.' });
  const datos = req.body || {};
  if (!validarMembresia(datos)) return res.status(400).json({ error: 'Revisa socio, tipo, fechas, precio y estado de la membresia.' });
  try {
    const resultado = await pool.query(
      `UPDATE membresias
          SET id_socio = $1, tipo = $2, fecha_inicio = $3, fecha_fin = $4, precio = $5, estado = $6
        WHERE id_membresia = $7 RETURNING *`,
      [datos.id_socio, datos.tipo.trim(), datos.fecha_inicio, datos.fecha_fin, Number(datos.precio), datos.estado, req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ error: 'Membresia no encontrada.' });
    res.status(200).json(resultado.rows[0]);
  } catch (error) { manejarError(error, res); }
});

router.delete('/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'El id_membresia debe ser un entero positivo.' });
  try {
    const resultado = await pool.query('DELETE FROM membresias WHERE id_membresia = $1 RETURNING *', [req.params.id]);
    if (!resultado.rows.length) return res.status(404).json({ error: 'Membresia no encontrada.' });
    res.status(200).json({ mensaje: 'Membresia eliminada.', membresia: resultado.rows[0] });
  } catch (error) { manejarError(error, res); }
});

module.exports = router;
