/* Interfaz del tracker: estado en localStorage, render y eventos. */
(function () {
  const L = window.TrackerLogic;
  const CLAVE = 'tracker-compromisos-riesgos:v1';
  const HOY = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD en hora local

  const ETIQUETA_SEMAFORO = { vencido: 'Vencido', por_vencer: 'Por vencer', al_dia: 'Al día', cerrado: 'Cerrado', sin_fecha: 'Sin fecha' };
  const $ = (sel) => document.querySelector(sel);

  let items = cargar();
  let editandoId = null;

  function cargar() {
    try {
      const guardado = JSON.parse(localStorage.getItem(CLAVE));
      if (Array.isArray(guardado) && guardado.length) return guardado;
    } catch (_) { /* almacenamiento no disponible: se usan los datos de ejemplo */ }
    return window.DatosEjemplo.generar(HOY);
  }

  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(items)); } catch (_) { /* modo privado */ }
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function criterios() {
    return { texto: $('#f-texto').value, tipo: $('#f-tipo').value, responsable: $('#f-responsable').value, semaforo: $('#f-semaforo').value };
  }

  function render() {
    renderKpis();
    renderResponsables();
    renderTabla();
    renderMatriz();
    renderCarga();
  }

  function renderKpis() {
    const r = L.resumen(items, HOY);
    const tiles = [
      ['Abiertos', r.abiertos, ''],
      ['Vencidos', r.vencidos, r.vencidos ? 'malo' : ''],
      ['Por vencer (≤3 días)', r.porVencer, r.porVencer ? 'alerta' : ''],
      ['Riesgos altos', r.riesgosAltos, r.riesgosAltos ? 'malo' : ''],
      ['Cumplimiento compromisos', r.cumplimiento + '%', '']
    ];
    $('#kpis').innerHTML = tiles.map(([t, v, c]) => `<div class="kpi ${c}"><span>${t}</span><strong>${v}</strong></div>`).join('');
  }

  function renderResponsables() {
    const nombres = [...new Set(items.map((i) => i.responsable))].sort();
    const sel = $('#f-responsable');
    const actual = sel.value;
    sel.innerHTML = '<option value="">Todos los responsables</option>' + nombres.map((n) => `<option>${esc(n)}</option>`).join('');
    sel.value = nombres.includes(actual) ? actual : '';
    $('#responsables').innerHTML = nombres.map((n) => `<option value="${esc(n)}">`).join('');
  }

  function renderTabla() {
    const lista = L.ordenar(L.filtrar(items, criterios(), HOY), HOY);
    $('#vacio').hidden = lista.length > 0;
    $('#tabla').innerHTML = lista.map((it) => {
      const s = L.semaforo(it, HOY);
      const sev = L.severidad(it);
      const nivel = L.nivelRiesgo(sev);
      return `<tr>
        <td class="mono">${esc(it.id)}</td>
        <td><div class="titulo">${esc(it.titulo)}</div><div class="meta">${it.tipo === 'riesgo' ? 'Riesgo' : 'Compromiso'}${it.origen ? ' · ' + esc(it.origen) : ''}</div>
          ${it.mitigacion ? `<div class="meta">Mitigación: ${esc(it.mitigacion)}</div>` : ''}</td>
        <td>${esc(it.responsable)}</td>
        <td class="mono">${esc(it.fecha || '—')}</td>
        <td><span class="pill ${s}">${ETIQUETA_SEMAFORO[s]}</span></td>
        <td>${sev == null ? '—' : `<span class="pill nivel-${nivel}">${sev} · ${nivel}</span>`}</td>
        <td class="acc">
          ${it.estado !== 'cerrado' ? `<button data-cerrar="${esc(it.id)}" title="Marcar cerrado">✓</button>` : ''}
          <button data-editar="${esc(it.id)}" title="Editar">✎</button>
        </td>
      </tr>`;
    }).join('');
  }

  function renderMatriz() {
    const m = L.matrizRiesgos(items);
    let html = '';
    for (let p = 5; p >= 1; p--) {
      for (let i = 1; i <= 5; i++) {
        const celda = m[p - 1][i - 1];
        const nivel = L.nivelRiesgo(p * i);
        const ids = celda.map((r) => r.id).join(', ');
        html += `<div class="celda nivel-${nivel}" title="P${p} × I${i}${ids ? ': ' + ids : ''}">${celda.length || ''}</div>`;
      }
    }
    $('#matriz').innerHTML = html;
  }

  function renderCarga() {
    const filas = L.cargaPorResponsable(items, HOY);
    const max = Math.max(1, ...filas.map((f) => f.abiertos));
    $('#carga').innerHTML = filas.map((f) => `
      <div class="barra-fila">
        <span>${esc(f.responsable)}</span>
        <div class="barra"><i style="width:${(f.abiertos / max) * 100}%"></i></div>
        <b>${f.abiertos}${f.vencidos ? ` <em>(${f.vencidos} venc.)</em>` : ''}</b>
      </div>`).join('') || '<p class="vacio">Sin pendientes.</p>';
  }

  // --- Formulario ---
  const dlg = $('#dlg');
  const form = $('#form');

  function abrir(item) {
    editandoId = item ? item.id : null;
    $('#dlg-titulo').textContent = item ? `Editar ${item.id}` : 'Nuevo ítem';
    form.reset();
    const base = item || { tipo: 'compromiso', estado: 'abierto', fecha: HOY };
    for (const el of form.elements) if (el.name && base[el.name] != null) el.value = base[el.name];
    form.tipo.disabled = !!item;
    alternarRiesgo();
    $('#errores').innerHTML = '';
    dlg.showModal();
  }

  function alternarRiesgo() {
    $('#campos-riesgo').hidden = form.tipo.value !== 'riesgo';
  }

  form.tipo.addEventListener('change', alternarRiesgo);
  $('#btn-cancelar').addEventListener('click', () => dlg.close());

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const datos = Object.fromEntries(new FormData(form));
    datos.tipo = form.tipo.value;
    const item = {
      tipo: datos.tipo,
      titulo: datos.titulo.trim(),
      responsable: datos.responsable.trim(),
      fecha: datos.fecha || '',
      estado: datos.estado,
      origen: datos.origen.trim()
    };
    if (item.tipo === 'riesgo') {
      item.probabilidad = Number(datos.probabilidad);
      item.impacto = Number(datos.impacto);
      item.mitigacion = datos.mitigacion.trim();
    }
    const errores = L.validar(item);
    if (errores.length) {
      $('#errores').innerHTML = errores.map((e) => `<li>${esc(e)}</li>`).join('');
      return;
    }
    if (editandoId) {
      items = items.map((it) => (it.id === editandoId ? { ...it, ...item } : it));
    } else {
      items.push({ id: L.nuevoId(items, item.tipo), ...item });
    }
    guardar();
    dlg.close();
    render();
  });

  // --- Eventos generales ---
  $('#btn-nuevo').addEventListener('click', () => abrir(null));
  ['#f-texto', '#f-tipo', '#f-responsable', '#f-semaforo'].forEach((s) => $(s).addEventListener('input', renderTabla));

  $('#tabla').addEventListener('click', (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    if (btn.dataset.editar) abrir(items.find((i) => i.id === btn.dataset.editar));
    if (btn.dataset.cerrar) {
      items = items.map((i) => (i.id === btn.dataset.cerrar ? { ...i, estado: 'cerrado' } : i));
      guardar();
      render();
    }
  });

  $('#btn-csv').addEventListener('click', () => {
    const blob = new Blob(['﻿' + L.aCSV(items, HOY)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tracker-${HOY}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $('#btn-reset').addEventListener('click', () => {
    if (!confirm('¿Reemplazar los datos actuales por los de ejemplo?')) return;
    items = window.DatosEjemplo.generar(HOY);
    guardar();
    render();
  });

  render();
})();
