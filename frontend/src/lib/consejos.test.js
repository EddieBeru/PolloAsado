import { describe, it, expect } from 'vitest'
import { generarConsejos } from './consejos'

const baldeOk = { gastado: 100, techo: 200 }
const baldeExcedido = { gastado: 250, techo: 200 }

describe('generarConsejos', () => {
  it('prioridad 1: avisa si algún balde superó su techo', () => {
    const baldes = { necesidad: baldeExcedido, gusto: baldeOk, ahorro: baldeOk }
    const mensajes = generarConsejos({ baldes, metasAhorro: [] })
    expect(mensajes).toHaveLength(1)
    expect(mensajes[0]).toContain('límite')
  })

  it('prioridad 2: con espacio en gusto y meta activa, sugiere mandar plata a la meta', () => {
    const baldes = { necesidad: baldeOk, gusto: { gastado: 100, techo: 200 }, ahorro: baldeOk }
    const metasAhorro = [{ nombre: 'Viaje', monto_meta: 1000, monto_actual: 500 }]
    const mensajes = generarConsejos({ baldes, metasAhorro })
    expect(mensajes[0]).toContain('Viaje')
    expect(mensajes[0]).toMatch(/\d+ mes/)
  })

  it('prioridad 3: con espacio en gusto sin metas activas, mensaje neutral', () => {
    const baldes = { necesidad: baldeOk, gusto: { gastado: 100, techo: 200 }, ahorro: baldeOk }
    const mensajes = generarConsejos({ baldes, metasAhorro: [] })
    expect(mensajes[0]).toMatch(/libres/)
    expect(mensajes[0]).not.toContain('meta')
  })

  it('prioridad 3: ignora metas ya completas', () => {
    const baldes = { necesidad: baldeOk, gusto: { gastado: 100, techo: 200 }, ahorro: baldeOk }
    const metasAhorro = [{ nombre: 'Completa', monto_meta: 100, monto_actual: 100 }]
    const mensajes = generarConsejos({ baldes, metasAhorro })
    expect(mensajes[0]).not.toContain('Completa')
  })

  it('prioridad 4: todo cuadrado sin sobrante, sin mensaje', () => {
    const baldeExacto = { gastado: 200, techo: 200 }
    const baldes = { necesidad: baldeExacto, gusto: baldeExacto, ahorro: baldeExacto }
    expect(generarConsejos({ baldes, metasAhorro: [] })).toEqual([])
  })

  it('nunca devuelve más de 2 mensajes', () => {
    const baldes = { necesidad: baldeExcedido, gusto: baldeExcedido, ahorro: baldeOk }
    const mensajes = generarConsejos({ baldes, metasAhorro: [] })
    expect(mensajes.length).toBeLessThanOrEqual(2)
  })
})
