import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Calendar,
  FolderOpen,
  Paperclip,
  Trash2,
  Tag as TagIcon,
  AlertCircle
} from 'lucide-react'
import {
  EventWithDetails,
  TagRecord,
  CreateEventInput,
  UpdateEventInput,
  CreateTagInput,
  FileAttachmentInput
} from '@shared/types'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  initialDate?: Date | null
  eventToEdit?: EventWithDetails | null
  availableTags: TagRecord[]
  onCreateTag?: (input: CreateTagInput) => Promise<TagRecord>
  onSave: (data: CreateEventInput | UpdateEventInput) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

const DEFAULT_TAG_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4'  // Cyan
]

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  eventToEdit,
  availableTags,
  onCreateTag,
  onSave,
  onDelete
}) => {
  const isEditing = !!eventToEdit

  // Form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
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
      setTagInput('')
      return
    }

    if (eventToEdit) {
      setTitle(eventToEdit.title)
      setDescription(eventToEdit.description || '')
      setDate(eventToEdit.date.slice(0, 10))
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
      const formattedDefault = format(defaultDate, 'yyyy-MM-dd')
      setTitle('')
      setDescription('')
      setDate(formattedDefault)
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

  // Memoized formatted date text
  const formattedDateText = useMemo(() => {
    if (!date) return ''
    try {
      const parsed = new Date(`${date}T12:00:00`)
      if (isNaN(parsed.getTime())) return date
      const formatted = format(parsed, 'EEEE d MMMM yyyy', { locale: it })
      return formatted.charAt(0).toUpperCase() + formatted.slice(1)
    } catch {
      return date
    }
  }, [date])

  // Tag creation / assignment on the fly
  const handleAddOrApplyTag = async (tagNameToApply: string) => {
    const trimmed = tagNameToApply.trim()
    if (!trimmed) return

    // Check if tag already exists in availableTags (case-insensitive)
    const existing = availableTags.find(
      (t) => t.name.toLowerCase() === trimmed.toLowerCase()
    )

    if (existing) {
      if (!selectedTagIds.includes(existing.id)) {
        setSelectedTagIds((prev) => [...prev, existing.id])
      }
      setTagInput('')
      return
    }

    // If tag does not exist, create it with a pleasant default color
    if (onCreateTag) {
      try {
        const randomColor =
          DEFAULT_TAG_COLORS[Math.floor(Math.random() * DEFAULT_TAG_COLORS.length)]
        const newTag = await onCreateTag({
          name: trimmed,
          colorHex: randomColor
        })
        setSelectedTagIds((prev) => [...prev, newTag.id])
        setTagInput('')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        setErrorMessage(msg)
      }
    }
  }

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddOrApplyTag(tagInput)
    }
  }

  const handleRemoveTag = (tagIdToRemove: string) => {
    setSelectedTagIds((prev) => prev.filter((id) => id !== tagIdToRemove))
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

    if (!date) {
      setErrorMessage('Inserisci una data valida.')
      return
    }

    setSubmitting(true)
    try {
      const payload: CreateEventInput | UpdateEventInput = {
        title: trimmedTitle,
        description: description.trim() || null,
        date,
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

  if (!isOpen) return null

  // Tags lookup
  const tagsById = new Map(availableTags.map((t) => [t.id, t]))
  const selectedTags = selectedTagIds
    .map((id) => tagsById.get(id))
    .filter((t): t is TagRecord => !!t)
  const unselectedTags = availableTags.filter((t) => !selectedTagIds.includes(t.id))

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
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">
                  {isEditing ? 'Modifica Scadenza' : 'Nuova Scadenza'}
                </h2>
                {formattedDateText && (
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200">
                    {formattedDateText}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEditing
                  ? 'Aggiorna i dettagli, tag e allegati della scadenza'
                  : 'Aggiungi titolo, tag e file associati a questo giorno'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
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
              placeholder="es. Pubblicazione Video YouTube, Invio Newsletter..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Tags Selector & Quick Creation */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Tag Associati
            </label>

            {/* Selected Tags Display */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {selectedTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border shadow-2xs transition"
                    style={{
                      backgroundColor: `${tag.colorHex}20`,
                      color: tag.colorHex,
                      borderColor: `${tag.colorHex}50`
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: tag.colorHex }}
                    />
                    <span>{tag.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag.id)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 transition cursor-pointer"
                      title="Rimuovi tag"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Quick Tag Creation / Input */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <TagIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Scrivi un tag e premi Invio per applicarlo o crearlo..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
              {tagInput.trim() && (
                <button
                  type="button"
                  onClick={() => handleAddOrApplyTag(tagInput)}
                  className="rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 transition"
                >
                  Applica
                </button>
              )}
            </div>

            {/* Suggested / Available Tags list */}
            {unselectedTags.length > 0 && (
              <div className="pt-1">
                <span className="text-[11px] text-slate-400 block mb-1">
                  Tag disponibili (clicca per associare):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {unselectedTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleAddOrApplyTag(tag.name)}
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium transition opacity-70 hover:opacity-100 border cursor-pointer"
                      style={{
                        backgroundColor: `${tag.colorHex}15`,
                        color: tag.colorHex,
                        borderColor: `${tag.colorHex}40`
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: tag.colorHex }}
                      />
                      <span>+ {tag.name}</span>
                    </button>
                  ))}
                </div>
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

          {/* Allegati Locali Section */}
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
                      {/* Action: Reveal in Folder */}
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
              {submitting ? 'Salvataggio...' : isEditing ? 'Salva Modifiche' : 'Crea Scadenza'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
