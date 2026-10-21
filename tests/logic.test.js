const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../src/logic.js');
const { generar } = require('../src/datos-ejemplo.js');

const HOY = '2026-10-20';
const base = { tipo: 'compromiso', titulo: 'X', responsable: 'Ana', estado: 'abierto' };

test('semáforo según la fecha comprometida', () => {
  assert.equal(L.semaforo({ ...base, fecha: '2026-10-19' }, HOY), 'vencido');
  assert.equal(L.semaforo({ ...base, fecha: '2026-10-20' }, HOY), 'por_vencer');
  assert.equal(L.semaforo({ ...base, fecha: '2026-10-23' }, HOY), 'por_vencer');
  assert.equal(L.semaforo({ ...base, fecha: '2026-10-24' }, HOY), 'al_dia');
  assert.equal(L.semaforo({ ...base, fecha: '' }, HOY), 'sin_fecha');
  assert.equal(L.semaforo({ ...base, fecha: '2026-01-01', estado: 'cerrado' }, HOY), 'cerrado');
});

test('severidad y nivel de riesgo', () => {
  const r = { ...base, tipo: 'riesgo', probabilidad: 4, impacto: 4 };
  assert.equal(L.severidad(r), 16);
  assert.equal(L.nivelRiesgo(16), 'alto');
  assert.equal(L.nivelRiesgo(8), 'medio');
  assert.equal(L.nivelRiesgo(4), 'bajo');
  assert.equal(L.severidad(base), null);
});

test('validación rechaza datos incompletos', () => {
  assert.deepEqual(L.validar({ ...base, fecha: '2026-10-20' }), []);
  assert.equal(L.validar({ ...base, titulo: '  ', responsable: '' }).length, 2);
  assert.equal(L.validar({ ...base, tipo: 'riesgo', probabilidad: 6, impacto: 0 }).length, 2);
});

test('ordenar pone lo vencido primero y luego los riesgos más severos', () => {
  const items = [
    { ...base, id: 'C-1', fecha: '2026-11-30' },
    { ...base, id: 'R-1', tipo: 'riesgo', probabilidad: 5, impacto: 5, fecha: '2026-11-30' },
    { ...base, id: 'C-2', fecha: '2026-10-01' },
    { ...base, id: 'C-3', fecha: '2026-10-01', estado: 'cerrado' }
  ];
  assert.deepEqual(L.ordenar(items, HOY).map((i) => i.id), ['C-2', 'R-1', 'C-1', 'C-3']);
});

test('filtrar combina criterios y texto libre', () => {
  const items = generar(HOY);
  const r = L.filtrar(items, { tipo: 'riesgo', texto: 'finanzas' }, HOY);
  assert.deepEqual(r.map((i) => i.id), ['R-002']);
});

test('resumen calcula KPIs sobre los datos de ejemplo', () => {
  const r = L.resumen(generar(HOY), HOY);
  assert.equal(r.total, 15);
  assert.equal(r.cerrados, 3);
  assert.equal(r.vencidos, 3);
  assert.equal(r.riesgosAltos, 2);
  assert.equal(r.cumplimiento, 22); // 2 de 9 compromisos cerrados
});

test('matriz ubica los riesgos abiertos en su celda', () => {
  const m = L.matrizRiesgos(generar(HOY));
  assert.deepEqual(m[3][3].map((r) => r.id), ['R-001']);
  assert.equal(m[1][1].length, 0); // R-006 está cerrado
});

test('CSV escapa comas y comillas', () => {
  const csv = L.aCSV([{ ...base, id: 'C-1', titulo: 'Hola, "mundo"', fecha: '' }], HOY);
  assert.match(csv.split('\n')[1], /"Hola, ""mundo"""/);
});

test('nuevoId sigue la numeración por tipo', () => {
  const items = generar(HOY);
  assert.equal(L.nuevoId(items, 'compromiso'), 'C-010');
  assert.equal(L.nuevoId(items, 'riesgo'), 'R-007');
});
