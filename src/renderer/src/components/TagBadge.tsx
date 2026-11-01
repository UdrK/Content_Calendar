import React from 'react'
import { TagRecord } from '@shared/types'

interface TagBadgeProps {
  tag: TagRecord
  size?: 'sm' | 'md'
  onRemove?: () => void
}

export const TagBadge: React.FC<TagBadgeProps> = ({ tag, size = 'sm', onRemove }) => {
  const sizeClasses =
    size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium shadow-xs transition ${sizeClasses}`}
      style={{
        backgroundColor: `${tag.colorHex}20`, // 12% opacity background
        color: tag.colorHex,
        border: `1px solid ${tag.colorHex}40`
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: tag.colorHex }}
      />
      <span>{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 transition"
          title="Rimuovi"
        >
          ×
        </button>
      )}
    </span>
  )
}
