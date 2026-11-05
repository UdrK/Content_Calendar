import React, { useState, useEffect } from 'react'
import {
  X,
  HardDrive,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  RefreshCw,
  Clock
} from 'lucide-react'
import { RetentionPolicy, AttachmentStorageStats, RetentionStats } from '@shared/types'

interface RetentionModalProps {
  isOpen: boolean
  onClose: () => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export const RetentionModal: React.FC<RetentionModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [stats, setStats] = useState<AttachmentStorageStats | null>(null)
  const [policy, setPolicy] = useState<RetentionPolicy>({
    retentionDays: null,
    onlyDone: true
  })
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<RetentionStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load stats and active policy on open
  useEffect(() => {
    if (!isOpen) return

    setSaveSuccess(false)
    setCleanupResult(null)
    setError(null)

    async function loadData() {
      setLoading(true)
      try {
        if (window.api?.retention) {
          const [loadedPolicy, loadedStats] = await Promise.all([
            window.api.retention.getPolicy(),
            window.api.retention.getStats()
          ])
          setPolicy(loadedPolicy)
          setStats(loadedStats)
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [isOpen])

  const handleSavePolicy = async (newPolicy: RetentionPolicy) => {
    setPolicy(newPolicy)
    setSaveSuccess(false)
    try {
      if (window.api?.retention) {
        const saved = await window.api.retention.setPolicy(newPolicy)
        setPolicy(saved)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 2000)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    }
  }

  const handleApplyRetentionNow = async () => {
    setApplying(true)
    setCleanupResult(null)
    setError(null)
    try {
      if (window.api?.retention) {
        const res = await window.api.retention.applyRetention()
        setCleanupResult(res)
        // Refresh storage stats
        const updatedStats = await window.api.retention.getStats()
        setStats(updatedStats)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setApplying(false)
    }
  }

  const handleOpenStorageFolder = async () => {
    if (stats?.storagePath && window.api?.fileSystem) {
      await window.api.fileSystem.revealInFolder(stats.storagePath)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Archivio Allegati & Retention</h2>
              <p className="text-[11px] text-slate-500">
                Cartella locale autonoma e regole di conservazione file
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs text-slate-700">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Storage Overview Card */}
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Spazio Copie Locali Gestite:</span>
              <span className="font-bold text-slate-900 text-sm">
                {stats ? `${stats.totalFiles} file (${formatBytes(stats.totalBytes)})` : 'Calcolo in corso...'}
              </span>
            </div>

            {stats?.storagePath && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-[11px] text-slate-500">
                <span className="truncate" title={stats.storagePath}>
                  Percorso: {stats.storagePath}
                </span>
                <button
                  type="button"
                  onClick={handleOpenStorageFolder}
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline shrink-0 cursor-pointer font-medium"
                  title="Apri nel gestore file del sistema"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span>Apri cartella</span>
                </button>
              </div>
            )}
          </div>

          {/* Retention Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-semibold text-slate-800 text-xs">
              <Clock className="h-4 w-4 text-blue-600" />
              <span>Politica di Conservazione Automatica (Retention)</span>
            </div>

            <p className="text-slate-500 text-[11px] leading-relaxed">
              I file degli eventi che soddisfano la regola vengono ripuliti in automatico
              all&apos;avvio dell&apos;applicazione o su richiesta, risparmiando spazio su disco.
            </p>

            {/* Retention Threshold Options */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {[
                { label: 'Conserva per sempre', days: null },
                { label: 'Elimina dopo 30 giorni', days: 30 },
                { label: 'Elimina dopo 60 giorni', days: 60 },
                { label: 'Elimina dopo 90 giorni', days: 90 }
              ].map((opt) => {
                const isSelected = policy.retentionDays === opt.days
                return (
                  <button
                    key={String(opt.days)}
                    type="button"
                    onClick={() => handleSavePolicy({ ...policy, retentionDays: opt.days })}
                    className={`flex items-center justify-between rounded-lg border p-2.5 text-xs transition cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 text-blue-800 font-semibold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />}
                  </button>
                )
              })}
            </div>

            {/* Only Done checkbox */}
            <label className="flex items-center gap-2 pt-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={policy.onlyDone}
                onChange={(e) => handleSavePolicy({ ...policy, onlyDone: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-700">
                Applica solo agli eventi contrassegnati come <strong>&ldquo;Fatto&rdquo;</strong> (consigliato)
              </span>
            </label>

            {saveSuccess && (
              <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                <span>Politica aggiornata e salvata!</span>
              </p>
            )}
          </div>

          {/* Manual Run Section */}
          <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-800">Esegui pulizia immediata</p>
              <p className="text-[11px] text-slate-400">
                Verifica gli eventi scaduti ed elimina le copie locali corrispondenti
              </p>
            </div>

            <button
              type="button"
              disabled={applying || !policy.retentionDays}
              onClick={handleApplyRetentionNow}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${applying ? 'animate-spin' : ''}`} />
              <span>{applying ? 'Pulizia in corso...' : 'Pulisci adesso'}</span>
            </button>
          </div>

          {cleanupResult && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Pulizia completata: {cleanupResult.purgedFilesCount} file rimossi da{' '}
                {cleanupResult.purgedEventsCount} eventi (liberati{' '}
                {formatBytes(cleanupResult.freedBytes || 0)}).
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-900 transition cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
