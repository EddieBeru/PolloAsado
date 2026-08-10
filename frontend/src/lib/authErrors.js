// Supabase devuelve los errores de auth en inglés y con vocabulario de API
// ("Invalid login credentials"). Mostrarlos tal cual deja al usuario sin saber
// qué pasó ni qué hacer, así que se traducen a una frase que explica el
// problema y el siguiente paso.

// Cada entrada: fragmento (en minúscula) que buscamos dentro del mensaje de
// Supabase -> texto que ve el usuario. El orden importa: gana el primero.
const MATCHES = [
  ['invalid login credentials', 'Correo o contraseña incorrectos.'],
  ['email not confirmed', 'Todavía no confirmaste tu correo. Buscá el mensaje que te enviamos.'],
  ['user already registered', 'Ese correo ya tiene cuenta. Iniciá sesión.'],
  ['already been registered', 'Ese correo ya tiene cuenta. Iniciá sesión.'],
  ['signups not allowed', 'No hay ninguna cuenta con ese correo. Creá una primero.'],
  ['user not found', 'No hay ninguna cuenta con ese correo.'],
  ['password should be at least', 'La contraseña necesita al menos 6 caracteres.'],
  ['different from the old password', 'La contraseña nueva tiene que ser distinta de la anterior.'],
  ['unable to validate email address', 'Ese correo no tiene un formato válido. Ejemplo: nombre@correo.com'],
  ['invalid email', 'Ese correo no tiene un formato válido. Ejemplo: nombre@correo.com'],
  ['you can only request this after', 'Esperá unos segundos antes de volver a pedirlo.'],
  ['rate limit', 'Demasiados intentos seguidos. Probá de nuevo en unos minutos.'],
  ['token has expired', 'Ese enlace ya venció. Pedí uno nuevo.'],
  ['expired', 'Ese enlace ya venció. Pedí uno nuevo.'],
  ['failed to fetch', 'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.'],
  ['network', 'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.'],
]

/**
 * Traduce un error de Supabase Auth a español.
 *
 * @param {unknown} err       Error devuelto por supabase.auth.*
 * @param {string}  fallback  Qué decir cuando el mensaje no se reconoce; se
 *                            escribe según la acción que falló, para que el
 *                            usuario sepa qué no ocurrió.
 */
export function authErrorMessage(err, fallback = 'No se pudo completar. Intentá de nuevo.') {
  const raw = typeof err === 'string' ? err : err?.message
  if (!raw) return fallback
  if (!navigator.onLine) return 'Sin conexión. Conectate e intentá de nuevo.'

  const needle = raw.toLowerCase()
  const hit = MATCHES.find(([fragment]) => needle.includes(fragment))
  if (hit) return hit[1]

  // Mensaje desconocido: el texto crudo de Supabase no le sirve a nadie acá.
  console.error('Error de auth sin traducir:', raw)
  return fallback
}
