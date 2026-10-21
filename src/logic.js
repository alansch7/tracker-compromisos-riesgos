/**
 * Lógica pura del tracker (sin DOM), compartida por la interfaz y los tests.
 * Se carga como script clásico en el navegador (window.TrackerLogic)
 * y con require() en Node.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TrackerLogic = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const DIAS_ALERTA = 3;
  const ESTADOS = ['abierto', 'en_curso', 'cerrado'];

  /** Diferencia en días entre dos fechas ISO (YYYY-MM-DD). */
  function diasEntre(desde, hasta) {
    const a = Date.UTC(...partes(desde));
    const b = Date.UTC(...partes(hasta));
    return Math.round((b - a) / 86400000);
  }

  function partes(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return [y, m - 1, d];
  }

  /**
   * Semáforo de plazo de un ítem respecto de "hoy":
   * cerrado | vencido | por_vencer (<= 3 días) | al_dia | sin_fecha
   */
  function semaforo(item, hoy) {
    if (item.estado === 'cerrado') return 'cerrado';
    if (!item.fecha) return 'sin_fecha';
    const dias = diasEntre(hoy, item.fecha);
    if (dias < 0) return 'vencido';
    if (dias <= DIAS_ALERTA) return 'por_vencer';
    return 'al_dia';
  }

  /** Severidad de un riesgo = probabilidad x impacto (escala 1-5 cada uno). */
  function severidad(item) {
    if (item.tipo !== 'riesgo') return null;
    return (item.probabilidad || 0) * (item.impacto || 0);
  }

  function nivelRiesgo(score) {
    if (score == null) return null;
    if (score >= 15) return 'alto';
    if (score >= 8) return 'medio';
    return 'bajo';
  }

  /** Valida un ítem antes de guardarlo. Devuelve lista de errores (vacía = ok). */
  function validar(item) {
    const errores = [];
    if (!item.titulo || !item.titulo.trim()) errores.push('El título es obligatorio.');
    if (!item.responsable || !item.responsable.trim()) errores.push('Debe tener un responsable.');
    if (!['compromiso', 'riesgo'].includes(item.tipo)) errores.push('Tipo inválido.');
    if (!ESTADOS.includes(item.estado)) errores.push('Estado inválido.');
    if (item.fecha && !/^\d{4}-\d{2}-\d{2}$/.test(item.fecha)) errores.push('Fecha con formato inválido.');
    if (item.tipo === 'riesgo') {
      for (const campo of ['probabilidad', 'impacto']) {
        const v = Number(item[campo]);
        if (!Number.isInteger(v) || v < 1 || v > 5) errores.push(`El ${campo} debe ser un entero entre 1 y 5.`);
      }
    }
    return errores;
  }

  /** Filtra por tipo, responsable, semáforo y texto libre. Criterios vacíos no filtran. */
  function filtrar(items, criterios, hoy) {
    const texto = (criterios.texto || '').trim().toLowerCase();
    return items.filter((it) => {
      if (criterios.tipo && it.tipo !== criterios.tipo) return false;
      if (criterios.responsable && it.responsable !== criterios.responsable) return false;
      if (criterios.semaforo && semaforo(it, hoy) !== criterios.semaforo) return false;
      if (texto) {
        const blob = [it.titulo, it.responsable, it.origen, it.mitigacion].join(' ').toLowerCase();
        if (!blob.includes(texto)) return false;
      }
      return true;
    });
  }

  /**
   * Orden de trabajo: primero lo vencido, luego por vencer, luego riesgos
   * más severos, y al final por fecha más próxima.
   */
  function ordenar(items, hoy) {
    const peso = { vencido: 0, por_vencer: 1, al_dia: 2, sin_fecha: 3, cerrado: 4 };
    return [...items].sort((a, b) => {
      const pa = peso[semaforo(a, hoy)];
      const pb = peso[semaforo(b, hoy)];
      if (pa !== pb) return pa - pb;
      const sa = severidad(a) || 0;
      const sb = severidad(b) || 0;
      if (sa !== sb) return sb - sa;
      return (a.fecha || '9999').localeCompare(b.fecha || '9999');
    });
  }

  /** KPIs del tablero. */
  function resumen(items, hoy) {
    const r = { total: items.length, abiertos: 0, vencidos: 0, porVencer: 0, cerrados: 0, riesgosAltos: 0, cumplimiento: 0 };
    for (const it of items) {
      const s = semaforo(it, hoy);
      if (s === 'cerrado') r.cerrados++;
      else r.abiertos++;
      if (s === 'vencido') r.vencidos++;
      if (s === 'por_vencer') r.porVencer++;
      if (it.estado !== 'cerrado' && nivelRiesgo(severidad(it)) === 'alto') r.riesgosAltos++;
    }
    const compromisos = items.filter((i) => i.tipo === 'compromiso');
    const cerrados = compromisos.filter((i) => i.estado === 'cerrado').length;
    r.cumplimiento = compromisos.length ? Math.round((cerrados / compromisos.length) * 100) : 0;
    return r;
  }

  /** Carga abierta por responsable, ordenada de mayor a menor. */
  function cargaPorResponsable(items, hoy) {
    const mapa = new Map();
    for (const it of items) {
      if (it.estado === 'cerrado') continue;
      const fila = mapa.get(it.responsable) || { responsable: it.responsable, abiertos: 0, vencidos: 0 };
      fila.abiertos++;
      if (semaforo(it, hoy) === 'vencido') fila.vencidos++;
      mapa.set(it.responsable, fila);
    }
    return [...mapa.values()].sort((a, b) => b.abiertos - a.abiertos || b.vencidos - a.vencidos);
  }

  /** Matriz 5x5 [probabilidad][impacto] con los riesgos abiertos de cada celda. */
  function matrizRiesgos(items) {
    const m = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => []));
    for (const it of items) {
      if (it.tipo !== 'riesgo' || it.estado === 'cerrado') continue;
      m[it.probabilidad - 1][it.impacto - 1].push(it);
    }
    return m;
  }

  function aCSV(items, hoy) {
    const cols = ['id', 'tipo', 'titulo', 'responsable', 'fecha', 'estado', 'semaforo', 'probabilidad', 'impacto', 'severidad', 'mitigacion', 'origen'];
    const esc = (v) => {
      const s = v == null ? '' : String(v);
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const filas = items.map((it) =>
      cols.map((c) => esc(c === 'semaforo' ? semaforo(it, hoy) : c === 'severidad' ? severidad(it) : it[c])).join(',')
    );
    return [cols.join(','), ...filas].join('\n');
  }

  function nuevoId(items, tipo) {
    const prefijo = tipo === 'riesgo' ? 'R' : 'C';
    const nums = items.filter((i) => i.id.startsWith(prefijo)).map((i) => Number(i.id.slice(2)) || 0);
    return `${prefijo}-${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`;
  }

  return { DIAS_ALERTA, ESTADOS, diasEntre, semaforo, severidad, nivelRiesgo, validar, filtrar, ordenar, resumen, cargaPorResponsable, matrizRiesgos, aCSV, nuevoId };
});
