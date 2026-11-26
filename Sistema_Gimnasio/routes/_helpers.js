function idValido(value) {
  return /^[1-9]\d*$/.test(String(value));
}

function enteroPositivo(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function textoValido(value, maxLength = Infinity) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

function correoValido(value) {
  return typeof value === 'string' && value.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function fechaValida(value) {
  if (typeof value !== 'string') return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) return false;
  if (match[4] !== undefined) {
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const second = Number(match[6] || 0);
    if (hour > 23 || minute > 59 || second > 59) return false;
  }
  return !Number.isNaN(Date.parse(value));
}

function manejarError(error, res) {
  if (error.code === '23505') return res.status(409).json({ error: 'Ya existe un registro con esos datos.' });
  if (error.code === '23503') return res.status(409).json({ error: 'La operacion afecta registros relacionados o usa un identificador inexistente.' });
  if (error.code === '23514' || error.code === '22P02' || error.code === '22007' || error.code === '22008') {
    return res.status(400).json({ error: 'Uno o mas datos no cumplen las reglas requeridas.' });
  }
  console.error(error);
  return res.status(500).json({ error: 'Error interno del servidor.' });
}

module.exports = { idValido, enteroPositivo, textoValido, correoValido, fechaValida, manejarError };
