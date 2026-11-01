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

export function validateEventDates(startDate: string, endDate?: string | null): void {
  if (!startDate) {
    throw new EventValidationError("La data di inizio dell'evento è obbligatoria.")
  }

  const start = new Date(startDate).getTime()
  if (isNaN(start)) {
    throw new EventValidationError("La data di inizio dell'evento non è valida.")
  }

  if (endDate) {
    const end = new Date(endDate).getTime()
    if (isNaN(end)) {
      throw new EventValidationError("La data di fine dell'evento non è valida.")
    }
    if (end < start) {
      throw new EventValidationError("La data di fine non può essere precedente alla data di inizio.")
    }
  }
}
