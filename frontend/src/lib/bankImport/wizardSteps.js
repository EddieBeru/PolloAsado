/** Filas que necesitan pasar por el wizard: flag sin resolver, o gasto sin categoría. Mismo criterio que exige canConfirm.
 *  'vincular' no inserta fila nueva (solo actualiza la existente), así que no exige categoría. */
export function pendingWizardRows(rows) {
  return rows.filter(r => r.incluir && (
    (r.flagTipo && !r.resolucion) ||
    (r.tipo === 'gasto' && !r.categoria && r.resolucion !== 'vincular')
  ))
}

/** Proyección de qué va a pasar al confirmar, para mostrar antes del insert real. */
export function summarizeRows(rows) {
  let creados = 0
  let vinculados = 0
  let omitidos = 0
  let yaImportados = 0

  for (const row of rows) {
    if (row.flagTipo === 'ya_importado') {
      yaImportados++
    } else if (!row.incluir) {
      omitidos++
    } else if (row.flagTipo === 'ya_existe' && row.resolucion === 'vincular') {
      vinculados++
    } else {
      creados++
    }
  }

  return { creados, vinculados, omitidos, yaImportados }
}
