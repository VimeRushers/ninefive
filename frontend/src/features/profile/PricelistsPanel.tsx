import { useQueryClient } from '@tanstack/react-query'
import { FileSpreadsheet, FileText, FolderOpen, LoaderCircle, Trash2, Upload } from 'lucide-react'
import { type DragEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { boardKeys } from '@/api/board'
import { profileKeys, useDeletePricelist, usePricelists, useUploadPricelist } from '@/api/profile'
import type { Pricelist } from '@/api/types'
import { Panel, PanelBody, PanelHeader } from '@/components/shared/Panel'
import { QueryState } from '@/components/shared/states'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PROFILE_ID } from '@/config'
import { useRelativeTime } from '@/hooks/use-relative-time'
import { formatDateTime } from '@/lib/format'
import { TONE_TILE } from '@/lib/tone'
import { cn } from '@/lib/utils'
import { FIELD_ID, focusField } from './form'

const ACCEPT = '.xlsx,.xls,.csv,.pdf'
/** The file input's `accept` doesn't apply to dropped files, so they are checked by name. */
const isAccepted = (file: File) => /\.(xlsx|xls|csv|pdf)$/i.test(file.name)

/**
 * usePricelists polls while a file is being read, but the catalogue doesn't.
 * When a pricelist finishes, its items are new, so reload the catalogue and the matches.
 */
function useReloadWhenRead(pricelists: Pricelist[] | undefined) {
  const queryClient = useQueryClient()
  const processing = pricelists?.filter((pricelist) => pricelist.status === 'processing').length ?? 0
  const previous = useRef(processing)

  useEffect(() => {
    if (processing < previous.current) {
      void queryClient.invalidateQueries({ queryKey: profileKeys.catalogue(PROFILE_ID) })
      void queryClient.invalidateQueries({ queryKey: boardKeys.all })
    }
    previous.current = processing
  }, [processing, queryClient])
}

export function PricelistsPanel({ className }: { className?: string }) {
  const { t } = useTranslation('profile')
  const query = usePricelists()
  const upload = useUploadPricelist()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [problems, setProblems] = useState<string[]>([])
  const [target, setTarget] = useState<Pricelist | null>(null)
  useReloadWhenRead(query.data)

  async function uploadFiles(files: File[]) {
    const messages: string[] = []
    for (const file of files) {
      if (!isAccepted(file)) {
        messages.push(t('pricelists.wrongType', { file: file.name }))
        continue
      }
      try {
        await upload.mutateAsync(file)
      } catch {
        messages.push(t('pricelists.uploadFailed', { file: file.name }))
      }
    }
    setProblems(messages)
  }

  const onDragOver = (event: DragEvent) => {
    event.preventDefault()
    setDragging(true)
  }

  return (
    <Panel className={className}>
      <PanelHeader title={t('pricelists.title')} />
      <PanelBody className="grid gap-4">
        <div
          onDragEnter={onDragOver}
          onDragOver={onDragOver}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
          }}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            void uploadFiles([...event.dataTransfer.files])
          }}
          className={cn(
            'grid justify-items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors duration-200',
            dragging ? 'border-primary bg-accent' : 'border-line-strong bg-surface-2',
          )}
        >
          <span className="grid size-10 place-items-center rounded-xl bg-card text-primary shadow-soft">
            <Upload aria-hidden className="size-5" />
          </span>
          <p className="text-sm font-bold">{t('pricelists.drop')}</p>
          <p className="max-w-xs text-xs text-muted-foreground">{t('pricelists.formats')}</p>
          <Button
            id={FIELD_ID.pricelistButton}
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            className="mt-1 h-9 rounded-lg px-3"
          >
            <FolderOpen aria-hidden />
            {t('pricelists.choose')}
          </Button>
          <input
            ref={inputRef}
            id={FIELD_ID.pricelistFile}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            aria-label={t('pricelists.inputLabel')}
            onChange={(event) => {
              const files = [...(event.target.files ?? [])]
              // Lets the same file be chosen again after a failure.
              event.target.value = ''
              void uploadFiles(files)
            }}
          />
          <div aria-live="polite" className="grid gap-1 text-xs">
            {upload.isPending && (
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
                {t('pricelists.uploading')}
              </p>
            )}
            {problems.map((problem) => (
              <p key={problem} className="font-semibold text-critical-ink">
                {problem}
              </p>
            ))}
          </div>
        </div>

        <QueryState query={query}>
          {(pricelists) =>
            pricelists.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('pricelists.empty')}</p>
            ) : (
              <ul aria-label={t('pricelists.title')} className="-my-1 divide-y">
                {pricelists.map((pricelist) => (
                  <PricelistRow
                    key={pricelist.id}
                    pricelist={pricelist}
                    onDelete={() => setTarget(pricelist)}
                  />
                ))}
              </ul>
            )
          }
        </QueryState>
      </PanelBody>
      <DeletePricelistDialog pricelist={target} onClose={() => setTarget(null)} />
    </Panel>
  )
}

function PricelistRow({ pricelist, onDelete }: { pricelist: Pricelist; onDelete: () => void }) {
  const { t, i18n } = useTranslation('profile')
  const uploaded = useRelativeTime(pricelist.uploaded_at)
  const Icon = pricelist.file_name.toLowerCase().endsWith('.pdf') ? FileText : FileSpreadsheet

  return (
    <li className="flex items-center gap-3 py-3">
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', TONE_TILE.accent)}>
        <Icon aria-hidden className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold" title={pricelist.file_name}>
          {pricelist.file_name}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <time dateTime={pricelist.uploaded_at} title={formatDateTime(pricelist.uploaded_at, i18n.language)}>
            {t('pricelists.uploaded', { time: uploaded })}
          </time>
          <PricelistStatus pricelist={pricelist} />
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onDelete}
        aria-label={t('pricelists.delete', { file: pricelist.file_name })}
        className="text-muted-foreground hover:text-critical-ink"
      >
        <Trash2 aria-hidden />
      </Button>
    </li>
  )
}

const badge = 'inline-flex items-center gap-1 rounded-md px-1.5 py-px text-2xs font-bold'

function PricelistStatus({ pricelist }: { pricelist: Pricelist }) {
  const { t } = useTranslation('profile')
  if (pricelist.status === 'processing') {
    return (
      <span className={cn(badge, TONE_TILE.info)}>
        <LoaderCircle aria-hidden className="size-3 animate-spin" />
        {t('pricelists.processing')}
      </span>
    )
  }
  if (pricelist.status === 'failed') {
    return <span className={cn(badge, TONE_TILE.critical)}>{t('pricelists.failed')}</span>
  }
  return (
    <span className={cn(badge, TONE_TILE.neutral)}>
      {t('pricelists.items', { count: pricelist.item_count })}
    </span>
  )
}

/** Deleting a pricelist also deletes the catalogue items read from it, so it asks first. */
function DeletePricelistDialog({ pricelist, onClose }: { pricelist: Pricelist | null; onClose: () => void }) {
  const { t } = useTranslation('profile')
  const remove = useDeletePricelist()
  // Keeps the text on screen while the dialog fades out.
  const [shown, setShown] = useState(pricelist)
  if (pricelist && pricelist !== shown) setShown(pricelist)

  const deleted = useRef(false)

  return (
    <Dialog open={pricelist !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          // After a delete the row's button is gone, so focus goes to the upload button instead.
          if (deleted.current) {
            event.preventDefault()
            focusField(FIELD_ID.pricelistButton)
          }
          deleted.current = false
          remove.reset()
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-bold">{t('pricelists.deleteTitle')}</DialogTitle>
          <DialogDescription>
            {shown && t('pricelists.deleteDescription', { file: shown.file_name, count: shown.item_count })}
          </DialogDescription>
        </DialogHeader>
        {remove.isError && (
          <p role="alert" className="text-sm font-semibold text-critical-ink">
            {t('pricelists.deleteFailed')}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('pricelists.cancel')}
          </Button>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() =>
              shown &&
              remove.mutate(shown.id, {
                onSuccess: () => {
                  deleted.current = true
                  onClose()
                },
              })
            }
          >
            {remove.isPending ? (
              <LoaderCircle aria-hidden className="animate-spin" />
            ) : (
              <Trash2 aria-hidden />
            )}
            {t('pricelists.confirmDelete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
