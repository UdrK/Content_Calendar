import React, { useState, useEffect } from 'react'
import {
  X,
  Calendar,
  FolderOpen,
  Paperclip,
  Trash2,
  Clock,
  Tag as TagIcon,
  AlertCircle,
  FileText
} from 'lucide-react'
import {
  EventWithDetails,
  TagRecord,
  CreateEventInput,
  UpdateEventInput,
  FileAttachmentInput
} from '@shared/types'
import { format } from 'date-fns'

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  initialDate?: Date | null
  eventToEdit?: EventWithDetails | null
  availableTags: TagRecord[]
  onSave: (data: CreateEventInput | UpdateEventInput) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  eventToEdit,
  availableTags,
  onSave,
  onDelete
}) => {
  const isEditing = !!eventToEdit

  // Form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isAllDay, setIsAllDay] = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [attachments, setAttachments] = useState<FileAttachmentInput[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [revealStatus, setRevealStatus] = useState<{ path: string; error?: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Initialize form state when opening
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null)
      setRevealStatus(null)
      setConfirmDelete(false)
      return
    }

    if (eventToEdit) {
      setTitle(eventToEdit.title)
      setDescription(eventToEdit.description || '')
      setStartDate(
        eventToEdit.startDate.slice(0, 16) // format for datetime-local
      )
      setEndDate(eventToEdit.endDate ? eventToEdit.endDate.slice(0, 16) : '')
      setIsAllDay(eventToEdit.isAllDay)
      setSelectedTagIds(eventToEdit.tags.map((t) => t.id))
      setAttachments(
        eventToEdit.attachments.map((a) => ({
          filePath: a.filePath,
          fileName: a.fileName,
          fileExtension: a.fileExtension
        }))
      )
    } else {
      const defaultDate = initialDate ? new Date(initialDate) : new Date()
      const formattedDefault = format(defaultDate, "yyyy-MM-dd'T'10:00")
      setTitle('')
      setDescription('')
      setStartDate(formattedDefault)
      setEndDate('')
      setIsAllDay(false)
      setSelectedTagIds([])
      setAttachments([])
    }
  }, [isOpen, eventToEdit, initialDate])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const handlePickFiles = async () => {
    try {
      if (window.api?.fileSystem) {
        const picked = await window.api.fileSystem.pickFiles()
        if (picked && picked.length > 0) {
          setAttachments((prev) => {
            const existingPaths = new Set(prev.map((a) => a.filePath))
            const newFiles = picked.filter((p) => !existingPaths.has(p.filePath))
            return [...prev, ...newFiles]
          })
        }
      }
    } catch (err: unknown) {
      console.error(err)
    }
  }

  const handleRemoveAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove))
  }

  const handleRevealInFolder = async (filePath: string) => {
    setRevealStatus(null)
    try {
      if (window.api?.fileSystem) {
        const result = await window.api.fileSystem.revealInFolder(filePath)
        if (!result.success) {
          setRevealStatus({ path: filePath, error: result.error || 'File non trovato' })
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setRevealStatus({ path: filePath, error: msg })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setErrorMessage("Inserisci un titolo per l'evento.")
      return
    }

    if (!startDate) {
      setErrorMessage("Inserisci una data di inizio valida.")
      return
    }

    setSubmitting(true)
    try {
      const payload: CreateEventInput | UpdateEventInput = {
        title: trimmedTitle,
        description: description.trim() || null,
        startDate,
        endDate: endDate ? endDate : null,
        isAllDay,
        tagIds: selectedTagIds,
        attachments,
        type: attachments.length > 0 ? 'attachment' : 'simple'
      }

      await onSave(payload)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMessage(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!eventToEdit || !onDelete) return
    setSubmitting(true)
    try {
      await onDelete(eventToEdit.id)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMessage(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {isEditing ? 'Modifica Evento' : 'Nuovo Evento'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? "Aggiorna le informazioni dell'evento e gli allegati associati"
                  : 'Crea un nuovo evento con tag e file locali'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Title Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Titolo Evento <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="es. Pubblicazione Video YouTube, Articolo Blog..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data Inizio <span className="text-rose-500">*</span>
              </label>
              <input
                type={isAllDay ? 'date' : 'datetime-local'}
                value={isAllDay ? startDate.slice(0, 10) : startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data Fine (Opzionale)
              </label>
              <input
                type={isAllDay ? 'date' : 'datetime-local'}
                value={isAllDay ? (endDate ? endDate.slice(0, 10) : '') : endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* All Day Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAllDay"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isAllDay" className="text-xs font-medium text-slate-600 cursor-pointer">
              Evento per tutto il giorno
            </label>
          </div>

          {/* Tags Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tag Associati
            </label>
            {availableTags.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Nessun tag disponibile. Creane uno tramite il pulsante "Gestione Tag".
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleToggleTag(tag.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition border ${
                        isSelected
                          ? 'ring-2 ring-offset-1 font-semibold'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: `${tag.colorHex}20`,
                        color: tag.colorHex,
                        borderColor: `${tag.colorHex}50`,
                        ...(isSelected ? { ringColor: tag.colorHex } : {})
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: tag.colorHex }}
                      />
                      <span>{tag.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Description Textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descrizione / Note
            </label>
            <textarea
              placeholder="Aggiungi dettagli, idee, note o script per questo evento..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Allegati Locali Section (Story 08 & 09) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-slate-600" />
                <span className="text-xs font-semibold text-slate-800">Allegati Locali</span>
                <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600">
                  {attachments.length}
                </span>
              </div>

              <button
                type="button"
                onClick={handlePickFiles}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:border-slate-400"
              >
                + Allega File Locale
              </button>
            </div>

            {/* List of Attached Files */}
            {attachments.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">
                Nessun file locale allegato. Puoi associare qualsiasi file salvato sul tuo computer.
              </p>
            ) : (
              <div className="space-y-1.5">
                {attachments.map((att, idx) => (
                  <div
                    key={att.filePath + idx}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-2xs group"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 uppercase">
                        {att.fileExtension || 'FILE'}
                      </span>
                      <span className="truncate text-xs font-medium text-slate-800" title={att.filePath}>
                        {att.fileName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      {/* Action: Reveal in Folder (Story 08 & 09) */}
                      <button
                        type="button"
                        onClick={() => handleRevealInFolder(att.filePath)}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50 transition"
                        title="Apri la cartella contenitore ed evidenzia il file"
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                        <span>Mostra nella Cartella</span>
                      </button>

                      {/* Remove attachment */}
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Rimuovi allegato"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error on reveal */}
            {revealStatus?.error && (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-800 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>{revealStatus.error}</span>
              </div>
            )}
          </div>
        </form>

        {/* Modal Footer */}
        <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-3 flex items-center justify-between">
          <div>
            {isEditing && onDelete && (
              <>
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-rose-600 font-semibold">Confermi l'eliminazione?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={submitting}
                      className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                    >
                      Sì, elimina
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="text-xs text-slate-500 hover:underline"
                    >
                      Annulla
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Elimina
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !title.trim()}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Salvataggio...' : isEditing ? 'Salva Modifiche' : 'Crea Evento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
