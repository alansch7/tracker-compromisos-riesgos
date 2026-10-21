/**
 * Datos 100% ficticios: "Proyecto Atlas", la migración de la intranet de una
 * empresa inventada (Empresa Demo S.A.). Personas, áreas y fechas son de ejemplo.
 *
 * Las fechas se definen como desfase en días respecto de hoy, para que la demo
 * siempre muestre una mezcla de ítems vencidos, por vencer y al día.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DatosEjemplo = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const PLANTILLA = [
    { id: 'C-001', tipo: 'compromiso', titulo: 'Enviar inventario de sitios y bibliotecas a migrar', responsable: 'Valentina Soto', dias: -6, estado: 'cerrado', origen: 'Kick-off' },
    { id: 'C-002', tipo: 'compromiso', titulo: 'Validar con TI la cuenta de servicio para la herramienta de migración', responsable: 'Matías Herrera', dias: -2, estado: 'en_curso', origen: 'Seguimiento semanal #1' },
    { id: 'C-003', tipo: 'compromiso', titulo: 'Definir dueños de contenido por área', responsable: 'Valentina Soto', dias: 1, estado: 'abierto', origen: 'Seguimiento semanal #1' },
    { id: 'C-004', tipo: 'compromiso', titulo: 'Publicar comunicado a usuarios sobre la ventana de congelamiento', responsable: 'Fernanda Paredes', dias: 3, estado: 'abierto', origen: 'Comité de cambios' },
    { id: 'C-005', tipo: 'compromiso', titulo: 'Ejecutar migración piloto del sitio de RR.HH.', responsable: 'Matías Herrera', dias: 8, estado: 'abierto', origen: 'Seguimiento semanal #2' },
    { id: 'C-006', tipo: 'compromiso', titulo: 'Preparar checklist de validación post-migración', responsable: 'Ignacio Morales', dias: 5, estado: 'en_curso', origen: 'Seguimiento semanal #2' },
    { id: 'C-007', tipo: 'compromiso', titulo: 'Agendar capacitación para usuarios clave', responsable: 'Fernanda Paredes', dias: -1, estado: 'abierto', origen: 'Seguimiento semanal #2' },
    { id: 'C-008', tipo: 'compromiso', titulo: 'Entregar reporte de permisos únicos a revisar', responsable: 'Ignacio Morales', dias: 12, estado: 'abierto', origen: 'Comité de cambios' },
    { id: 'C-009', tipo: 'compromiso', titulo: 'Aprobar plan de olas de migración', responsable: 'Rodrigo Vidal', dias: -9, estado: 'cerrado', origen: 'Comité directivo' },
    { id: 'R-001', tipo: 'riesgo', titulo: 'Bibliotecas con rutas mayores a 400 caracteres fallan en la copia', responsable: 'Matías Herrera', dias: 4, estado: 'abierto', probabilidad: 4, impacto: 4, mitigacion: 'Escanear rutas largas y acortar nombres antes de cada ola.', origen: 'Prueba técnica' },
    { id: 'R-002', tipo: 'riesgo', titulo: 'Baja disponibilidad de usuarios clave por cierre contable', responsable: 'Valentina Soto', dias: 10, estado: 'abierto', probabilidad: 3, impacto: 5, mitigacion: 'Mover el área de Finanzas a la última ola.', origen: 'Seguimiento semanal #2' },
    { id: 'R-003', tipo: 'riesgo', titulo: 'Flujos de aprobación antiguos sin equivalente en la nueva plataforma', responsable: 'Ignacio Morales', dias: 15, estado: 'en_curso', probabilidad: 3, impacto: 3, mitigacion: 'Inventariar flujos y rediseñar los 5 más usados.', origen: 'Kick-off' },
    { id: 'R-004', tipo: 'riesgo', titulo: 'Resistencia al cambio en usuarios de terreno', responsable: 'Fernanda Paredes', dias: 20, estado: 'abierto', probabilidad: 2, impacto: 3, mitigacion: 'Videos cortos y embajadores por faena.', origen: 'Comité de cambios' },
    { id: 'R-005', tipo: 'riesgo', titulo: 'Licencias insuficientes para cuentas externas', responsable: 'Rodrigo Vidal', dias: -3, estado: 'abierto', probabilidad: 2, impacto: 4, mitigacion: 'Confirmar cupo con el área de compras.', origen: 'Comité directivo' },
    { id: 'R-006', tipo: 'riesgo', titulo: 'Pérdida de metadatos de versión en documentos antiguos', responsable: 'Matías Herrera', dias: -5, estado: 'cerrado', probabilidad: 2, impacto: 2, mitigacion: 'Se validó que la herramienta conserva las últimas 10 versiones.', origen: 'Prueba técnica' }
  ];

  function sumarDias(base, dias) {
    const d = new Date(base + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + dias);
    return d.toISOString().slice(0, 10);
  }

  /** Devuelve los ítems de ejemplo con fechas reales calculadas desde `hoy`. */
  function generar(hoy) {
    return PLANTILLA.map(({ dias, ...resto }) => ({ ...resto, fecha: sumarDias(hoy, dias) }));
  }

  return { generar, sumarDias };
});
