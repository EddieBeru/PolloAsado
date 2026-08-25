import { parseBCR } from './parseBCR'

/**
 * Contrato que sigue cada parser de banco: `id` estable para guardar junto al
 * movimiento, `label` para mostrar en la UI, `parse(rawText) -> RawMovement[]`
 * (o lanza `BankFileParseError` si el archivo no matchea el formato esperado).
 */
export const BANK_PARSERS = {
  bcr: { id: 'bcr', label: 'BCR', parse: parseBCR }
}

export function getBankParser(bankId) {
  const parser = BANK_PARSERS[bankId]
  if (!parser) throw new Error(`Banco no soportado: ${bankId}`)
  return parser
}
