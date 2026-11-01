import React, { useState, useEffect } from 'react'
import { X, Plus, Edit2, Trash2, Check, AlertCircle, Tag as TagIcon } from 'lucide-react'
import { TagRecord, CreateTagInput } from '@shared/types'
import { TagBadge } from './TagBadge'

interface TagManagerModalProps {
  isOpen: boolean
  onClose: () => void
  tags: TagRecord[]
  loading: boolean
  error: string | null
  onCreateTag: (input: CreateTagInput) => Promise<TagRecord>
  onUpdateTag: (id: string, input: { name?: string; colorHex?: string }) => Promise<TagRecord>
  onDeleteTag: (id: string) => Promise<boolean>
  onClearError: () => void
}

const PRESET_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#64748B'  // Slate
]

export const TagManagerModal: React.FC<TagManagerModalProps> = ({
  isOpen,
  onClose,
  tags,
  loading,
  error,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  onClearError
}) => {
  // New Tag Form State
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[5]) // Default Blue
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Edit Mode State
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    onClearError()

    const trimmed = newName.trim()
    if (!trimmed) {
      setFormError('Inserisci un nome per il tag.')
      return
    }

    setSubmitting(true)
    try {
      await onCreateTag({ name: trimmed, colorHex: newColor })
      setNewName('')
      setNewColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setFormError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const startEditing = (tag: TagRecord) => {
    setEditingTagId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.colorHex)
    setFormError(null)
  }

  const cancelEditing = () => {
    setEditingTagId(null)
    setEditName('')
    setEditColor('')
  }

  const handleUpdate = async (id: string) => {
    setFormError(null)
    const trimmed = editName.trim()
    if (!trimmed) {
      setFormError('Il nome non può essere vuoto.')
      return
    }

    try {
      await onUpdateTag(id, { name: trimmed, colorHex: editColor })
      setEditingTagId(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setFormError(msg)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await onDeleteTag(id)
      setDeletingTagId(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setFormError(msg)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <TagIcon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Gestione Tag</h2>
              <p className="text-xs text-slate-500">Crea, personalizza ed elimina i tag per categorizzare gli eventi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Alert */}
          {(formError || error) && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{formError || error}</span>
            </div>
          )}

          {/* Form Crea Nuovo Tag */}
          <form onSubmit={handleCreate} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Nuovo Tag</h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nome tag (es. YouTube, Blog, Newsletter)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={50}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={submitting || !newName.trim()}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Aggiungi
              </button>
            </div>

            {/* Color Selector */}
            <div>
              <label className="text-[11px] font-medium text-slate-500">Colore Identificativo</label>
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`h-6 w-6 rounded-full transition transform hover:scale-110 flex items-center justify-center ${
                      newColor === c ? 'ring-2 ring-blue-600 ring-offset-2' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {newColor === c && <Check className="h-3 w-3 text-white" />}
                  </button>
                ))}

                {/* Custom Native Color Picker */}
                <label
                  title="Scegli colore personalizzato"
                  className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] text-slate-500 hover:border-slate-400"
                >
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value.toUpperCase())}
                    className="sr-only"
                  />
                  <span>#</span>
                </label>

                {/* Preview Badge */}
                {newName.trim() && (
                  <div className="ml-auto flex items-center gap-1 text-xs text-slate-500">
                    <span className="text-[11px]">Anteprima:</span>
                    <TagBadge tag={{ id: 'preview', name: newName.trim(), colorHex: newColor }} />
                  </div>
                )}
              </div>
            </div>
          </form>

          {/* Elenco Tag Esistenti */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tag Esistenti ({tags.length})
              </h3>
            </div>

            {loading ? (
              <p className="text-xs text-slate-400 py-4 text-center">Caricamento tag in corso...</p>
            ) : tags.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                Nessun tag creato finora. Usa il modulo qui sopra per aggiungere il tuo primo tag!
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
                {tags.map((tag) => {
                  const isEditing = editingTagId === tag.id
                  const isDeleting = deletingTagId === tag.id

                  if (isEditing) {
                    return (
                      <div key={tag.id} className="p-3 bg-blue-50/50 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            maxLength={50}
                            className="flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdate(tag.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            <Check className="h-3 w-3" /> Salva
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                          >
                            Annulla
                          </button>
                        </div>
                        {/* Edit Color Palette */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {PRESET_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setEditColor(c)}
                              className={`h-5 w-5 rounded-full transition ${
                                editColor === c ? 'ring-2 ring-blue-600 ring-offset-1' : ''
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                          <label className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white text-[9px] text-slate-500">
                            <input
                              type="color"
                              value={editColor}
                              onChange={(e) => setEditColor(e.target.value.toUpperCase())}
                              className="sr-only"
                            />
                            <span>#</span>
                          </label>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between p-3 hover:bg-slate-50/60 transition group"
                    >
                      <TagBadge tag={tag} size="md" />

                      <div className="flex items-center gap-1">
                        {isDeleting ? (
                          <div className="flex items-center gap-1.5 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
                            <span className="text-[11px] font-medium text-rose-700">Confermi?</span>
                            <button
                              onClick={() => handleDelete(tag.id)}
                              className="text-[11px] font-semibold text-rose-600 hover:underline"
                            >
                              Sì, elimina
                            </button>
                            <button
                              onClick={() => setDeletingTagId(null)}
                              className="text-[11px] text-slate-500 hover:underline"
                            >
                              Annulla
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditing(tag)}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                              title="Modifica"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingTagId(tag.id)}
                              className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                              title="Elimina"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
