export class EventValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EventValidationError'
  }
}

export function validateEventTitle(title: string): string {
  const trimmed = title?.trim()
  if (!trimmed) {
    throw new EventValidationError("Il titolo dell'evento non può essere vuoto.")
  }
  if (trimmed.length > 200) {
    throw new EventValidationError("Il titolo dell'evento non può superare i 200 caratteri.")
  }
  return trimmed
}

export function validateEventDate(date: string): string {
  const trimmed = date?.trim()
  if (!trimmed) {
    throw new EventValidationError("La data dell'evento è obbligatoria.")
  }

  const parsed = new Date(trimmed).getTime()
  if (isNaN(parsed)) {
    throw new EventValidationError("La data dell'evento non è valida.")
  }
  return trimmed
}
