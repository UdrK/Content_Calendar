import React, { useState, useEffect, useMemo, useRef } from 'react'
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
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Focus title input on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        titleInputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

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
        {/* Minimal Notion-style Header / Window Bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {isEditing ? 'Modifica Evento' : 'Nuovo Evento'}
          </span>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
            title="Chiudi (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overflow-x-hidden px-6 pb-6 pt-1 space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Hero Title (Notion Style) */}
          <div className="pt-1">
            <input
              ref={titleInputRef}
              type="text"
              placeholder="Inserisci un titolo..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              className="w-full text-xl font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none border-none p-0 bg-transparent tracking-tight"
            />
          </div>

          {/* Properties Section (Notion-style Key-Value Table) */}
          <div className="space-y-3 py-3 border-y border-slate-100 text-xs">
            {/* Date Property */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 w-20 text-slate-400 font-medium shrink-0">
                <Calendar className="h-3.5 w-3.5" />
                <span>Data</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-700 bg-slate-100/90 px-2.5 py-1 rounded-md text-xs">
                  {formattedDateText || 'Nessuna data'}
                </span>
              </div>
            </div>

            {/* Tags Property */}
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-1.5 w-20 text-slate-400 font-medium shrink-0 pt-1">
                <TagIcon className="h-3.5 w-3.5" />
                <span>Tag</span>
              </div>

              <div className="flex-1 space-y-2 min-w-0">
                {/* Selected Tags + Quick Input */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium border shadow-2xs transition"
                      style={{
                        backgroundColor: `${tag.colorHex}18`,
                        color: tag.colorHex,
                        borderColor: `${tag.colorHex}40`
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
                        className="ml-0.5 rounded-sm p-0.5 hover:bg-black/10 transition cursor-pointer"
                        title="Rimuovi tag"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}

                  {/* Inline Tag Input */}
                  <div className="inline-flex items-center gap-1">
                    <input
                      type="text"
                      placeholder={selectedTags.length === 0 ? "Scrivi tag e premi Invio..." : "+ Altro tag..."}
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagInputKeyDown}
                      className="text-xs bg-transparent placeholder-slate-400 text-slate-700 focus:outline-none px-2 py-0.5 min-w-[150px] border border-dashed border-slate-200 hover:border-slate-300 focus:border-blue-400 rounded-md transition"
                    />
                    {tagInput.trim() && (
                      <button
                        type="button"
                        onClick={() => handleAddOrApplyTag(tagInput)}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 cursor-pointer"
                      >
                        Applica
                      </button>
                    )}
                  </div>
                </div>

                {/* Available Tags list (clean ghost pills without noisy label) */}
                {unselectedTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {unselectedTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleAddOrApplyTag(tag.name)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition opacity-60 hover:opacity-100 border border-dashed hover:border-solid cursor-pointer"
                        style={{
                          backgroundColor: `${tag.colorHex}0c`,
                          color: tag.colorHex,
                          borderColor: `${tag.colorHex}30`
                        }}
                        title={`Associa tag "${tag.name}"`}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: tag.colorHex }}
                        />
                        <span>{tag.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description Textarea (Clean canvas feel) */}
          <div>
            <textarea
              placeholder="Aggiungi una descrizione, note o link per questo evento..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-200/80 bg-slate-50/40 p-3 text-xs text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-100 transition resize-y"
            />
          </div>

          {/* Attachments Section */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Paperclip className="h-3.5 w-3.5" />
                <span>Allegati</span>
                {attachments.length > 0 && (
                  <span className="rounded-full bg-slate-100 text-slate-600 px-1.5 py-0.2 text-[10px] font-semibold">
                    {attachments.length}
                  </span>
                )}
              </div>

              {attachments.length > 0 && (
                <button
                  type="button"
                  onClick={handlePickFiles}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  + Aggiungi file
                </button>
              )}
            </div>

            {/* List of Attached Files / Empty state */}
            {attachments.length === 0 ? (
              <button
                type="button"
                onClick={handlePickFiles}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 py-2.5 px-3 text-xs text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                <span>Allega file dal computer</span>
              </button>
            ) : (
              <div className="space-y-1.5">
                {attachments.map((att, idx) => (
                  <div key={att.filePath + idx} className="flex items-center gap-2 group min-w-0 w-full">
                    {/* Entire clickable card to reveal file in folder */}
                    <div
                      onClick={() => handleRevealInFolder(att.filePath)}
                      className="flex flex-1 min-w-0 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-2xs hover:bg-blue-50/60 hover:border-blue-300 transition cursor-pointer"
                      title="Clicca per aprire la cartella contenitore ed evidenziare il file"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 uppercase shrink-0">
                          {att.fileExtension || 'FILE'}
                        </span>
                        <span className="truncate text-xs font-medium text-slate-800" title={att.filePath}>
                          {att.fileName}
                        </span>
                      </div>
                      <FolderOpen className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 transition shrink-0 ml-2" />
                    </div>

                    {/* Separate remove button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 bg-white shadow-2xs transition cursor-pointer shrink-0"
                      title="Rimuovi allegato"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
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
        <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-3 flex items-center justify-between">
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
                      className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer"
                    >
                      Sì, elimina
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="text-xs text-slate-500 hover:underline cursor-pointer"
                    >
                      Annulla
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer"
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
              className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !title.trim()}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
            >
              {submitting ? 'Salvataggio...' : isEditing ? 'Salva Modifiche' : 'Crea Evento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
