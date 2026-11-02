import React, { useMemo, useState, useEffect } from 'react'
import {
  X,
  Calendar,
  FolderOpen,
  Paperclip,
  Pencil,
  CheckCircle2,
  Circle,
  AlertCircle
} from 'lucide-react'
import { EventWithDetails } from '@shared/types'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface EventDetailsPanelProps {
  event: EventWithDetails | null
  onToggleDone: (event: EventWithDetails) => Promise<void>
  onEdit: (event: EventWithDetails) => void
  onDeselect: () => void
}

export const EventDetailsPanel: React.FC<EventDetailsPanelProps> = ({
  event,
  onToggleDone,
  onEdit,
  onDeselect
}) => {
  const [revealError, setRevealError] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)

  // Clear errors when active event changes
  useEffect(() => {
    setRevealError(null)
    setToggling(false)
  }, [event?.id])

  // Formatted date
  const formattedDate = useMemo(() => {
    if (!event?.date) return ''
    try {
      const parsed = new Date(`${event.date.slice(0, 10)}T12:00:00`)
      if (isNaN(parsed.getTime())) return event.date
      const str = format(parsed, 'EEEE d MMMM yyyy', { locale: it })
      return str.charAt(0).toUpperCase() + str.slice(1)
    } catch {
      return event.date
    }
  }, [event?.date])

  // If no event is selected, render a quiet, elegant empty state
  if (!event) {
    return (
      <div className="h-80 border-t border-slate-200 bg-white flex flex-col items-center justify-center text-slate-400 gap-2 select-none shrink-0 px-6">
        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-0.5">
          <Calendar className="h-4 w-4" />
        </div>
        <p className="text-xs font-semibold text-slate-600">
          Nessun evento selezionato
        </p>
        <p className="text-[11px] text-slate-400">
          Clicca su un evento nel calendario per visualizzarne i dettagli o clicca su un giorno per crearne uno nuovo
        </p>
      </div>
    )
  }

  const isDone = !!event.isDone

  const handleStatusToggle = async () => {
    if (toggling) return
    setToggling(true)
    try {
      await onToggleDone(event)
    } finally {
      setToggling(false)
    }
  }

  const handleRevealInFolder = async (filePath: string) => {
    setRevealError(null)
    try {
      if (window.api?.fileSystem) {
        const result = await window.api.fileSystem.revealInFolder(filePath)
        if (!result.success) {
          setRevealError(result.error || 'Impossibile trovare il file sul disco.')
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setRevealError(msg)
    }
  }

  return (
    <div className="h-80 border-t border-slate-200 bg-white flex flex-col shrink-0 overflow-hidden shadow-xs">
      {/* Top Bar: Status, Title, Date, Actions */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-2.5 bg-slate-50/70 shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Immediate Status Toggle Button */}
          <button
            type="button"
            onClick={handleStatusToggle}
            disabled={toggling}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border transition cursor-pointer active:scale-95 disabled:opacity-50 shrink-0 ${
              isDone
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
            title="Clicca per invertire lo stato immediatamente (senza conferma)"
          >
            {isDone ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Fatto</span>
              </>
            ) : (
              <>
                <Circle className="h-3.5 w-3.5 text-rose-500" />
                <span>Da fare</span>
              </>
            )}
          </button>

          {/* Title between Status and Date */}
          <h3
            className={`text-sm md:text-base font-bold tracking-tight truncate transition min-w-0 ${
              isDone ? 'text-slate-400 line-through' : 'text-slate-900'
            }`}
            title={event.title}
          >
            {event.title}
          </h3>

          {/* Date Pill */}
          {formattedDate && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 shrink-0 pl-2 border-l border-slate-200">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>{formattedDate}</span>
            </div>
          )}
        </div>

        {/* Right Actions: Edit & Deselect */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(event)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer"
            title="Apri la modale per modificare titolo, data, tag o note"
          >
            <Pencil className="h-3.5 w-3.5 text-slate-500" />
            <span>Modifica</span>
          </button>

          <button
            type="button"
            onClick={onDeselect}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
            title="Chiudi dettagli (Deseleziona)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Panel Body: Stacked Layout (Tags -> Description -> Attachments) */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5">
        {/* 1. Tags */}
        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {event.tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-semibold border shadow-2xs"
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
              </span>
            ))}
          </div>
        )}

        {/* 2. Description */}
        <div>
          {event.description ? (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
              {event.description}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Nessuna descrizione o nota inserita.</p>
          )}
        </div>

        {/* 3. Attachments */}
        {event.attachments && event.attachments.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Paperclip className="h-3.5 w-3.5 text-slate-500" />
              <span>Allegati Locali ({event.attachments.length})</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {event.attachments.map((att, idx) => (
                <div
                  key={att.filePath + idx}
                  onClick={() => handleRevealInFolder(att.filePath)}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-2xs hover:bg-blue-50/60 hover:border-blue-300 transition cursor-pointer min-w-0 group"
                  title="Clicca per aprire la cartella ed evidenziare il file"
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
              ))}
            </div>
          </div>
        )}

        {/* Reveal error message */}
        {revealError && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{revealError}</span>
          </div>
        )}
      </div>
    </div>
  )
}
