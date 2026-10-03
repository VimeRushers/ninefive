import { Check, Info, LoaderCircle, PackageOpen, Pencil, Trash2, Upload, X } from 'lucide-react'
import { type KeyboardEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCatalogue, useDeleteCatalogueItem, usePricelists, useUpdateCatalogueItem } from '@/api/profile'
import type { CatalogueItem, CatalogueItemUpdate } from '@/api/types'
import { Panel, PanelBody, PanelHeader } from '@/components/shared/Panel'
import { QueryState } from '@/components/shared/states'
import { Table, Td, Th, Tr } from '@/components/shared/Table'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { parseNumber } from './draft'
import { FieldNote } from './Field'
import { inputClass, openPricelistPicker } from './form'

/** Products and services read from the pricelists. The AI compares them with what tenders ask for. */
export function CataloguePanel({ className }: { className?: string }) {
  const { t } = useTranslation('profile')
  const query = useCatalogue()
  const { data: pricelists } = usePricelists()
  const fileOf = (item: CatalogueItem) => pricelists?.find((p) => p.id === item.pricelist_id)?.file_name

  return (
    <Panel className={className}>
      <PanelHeader
        title={t('catalogue.title')}
        actions={
          query.data &&
          query.data.length > 0 && (
            <span className="text-xs font-semibold text-muted-foreground tabular-nums">
              {t('catalogue.count', { count: query.data.length })}
            </span>
          )
        }
      />
      <PanelBody className="pb-3">
        <p className="flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-xs text-ink-2">
          <Info aria-hidden className="mt-px size-3.5 shrink-0 text-muted-foreground" />
          {t('catalogue.note')}
        </p>
      </PanelBody>
      {query.data ? (
        <CatalogueItems items={query.data} fileOf={fileOf} />
      ) : (
        // Loading and errors, with the panel's padding.
        <PanelBody>
          <QueryState query={query}>{() => null}</QueryState>
        </PanelBody>
      )}
    </Panel>
  )
}

function CatalogueItems({
  items,
  fileOf,
}: {
  items: CatalogueItem[]
  fileOf: (item: CatalogueItem) => string | undefined
}) {
  const { t } = useTranslation('profile')
  if (items.length === 0) return <CatalogueEmpty />
  return (
    <div className="pb-3">
      <Table>
        <thead>
          <tr>
            <Th>{t('catalogue.name')}</Th>
            <Th>{t('catalogue.description')}</Th>
            <Th numeric>{t('catalogue.price')}</Th>
            {/* Relative, so the hidden label stays inside the table's scroll area on phones. */}
            <Th className="relative">
              <span className="sr-only">{t('catalogue.actions')}</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <CatalogueRow key={item.id} item={item} source={fileOf(item)} />
          ))}
        </tbody>
      </Table>
    </div>
  )
}

function CatalogueEmpty() {
  const { t } = useTranslation('profile')
  return (
    <div className="flex flex-col items-start gap-2 px-[18px] pt-2 pb-7">
      <div className="mb-1 grid size-10 place-items-center rounded-xl bg-surface-3 text-muted-foreground">
        <PackageOpen aria-hidden className="size-5" />
      </div>
      <h3 className="text-base font-bold">{t('catalogue.emptyTitle')}</h3>
      <p className="max-w-prose text-sm text-muted-foreground">{t('catalogue.emptyDescription')}</p>
      <Button variant="outline" onClick={openPricelistPicker} className="mt-2 h-9 rounded-lg px-3">
        <Upload aria-hidden />
        {t('catalogue.emptyAction')}
      </Button>
    </div>
  )
}

function CatalogueRow({ item, source }: { item: CatalogueItem; source?: string }) {
  const { t, i18n } = useTranslation('profile')
  const [editing, setEditing] = useState(false)
  const remove = useDeleteCatalogueItem()
  const editButton = useRef<HTMLButtonElement>(null)

  if (editing) {
    return (
      <CatalogueRowEditor
        item={item}
        onDone={() => {
          setEditing(false)
          requestAnimationFrame(() => editButton.current?.focus())
        }}
      />
    )
  }

  return (
    <Tr>
      <Td className="min-w-48 py-3">
        <p className="font-semibold text-foreground">{item.name}</p>
        {source && <p className="mt-0.5 text-xs text-faint">{t('catalogue.from', { file: source })}</p>}
        {remove.isError && (
          <p role="alert" className="mt-1 text-xs font-semibold text-critical-ink">
            {t('catalogue.deleteFailed')}
          </p>
        )}
      </Td>
      <Td className="min-w-56 py-3 text-ink-2">{item.description}</Td>
      <Td numeric className="font-semibold whitespace-nowrap">
        {formatMoney(item.price, i18n.language)}
      </Td>
      <Td className="w-px py-2">
        <div className="flex justify-end gap-0.5">
          <Button
            ref={editButton}
            variant="ghost"
            size="icon-sm"
            onClick={() => setEditing(true)}
            aria-label={t('catalogue.edit', { name: item.name })}
            className="text-muted-foreground"
          >
            <Pencil aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={remove.isPending}
            onClick={() => remove.mutate(item.id)}
            aria-label={t('catalogue.delete', { name: item.name })}
            className="text-muted-foreground hover:text-critical-ink"
          >
            {remove.isPending ? (
              <LoaderCircle aria-hidden className="animate-spin" />
            ) : (
              <Trash2 aria-hidden />
            )}
          </Button>
        </div>
      </Td>
    </Tr>
  )
}

/** The row as inputs. Enter saves, Escape cancels. Sends only what changed. */
function CatalogueRowEditor({ item, onDone }: { item: CatalogueItem; onDone: () => void }) {
  const { t } = useTranslation('profile')
  const save = useUpdateCatalogueItem()
  const [name, setName] = useState(item.name)
  const [description, setDescription] = useState(item.description)
  const [price, setPrice] = useState(String(item.price.amount))
  const [checked, setChecked] = useState(false)

  const amount = parseNumber(price)
  const nameError = name.trim() ? undefined : t('catalogue.nameRequired')
  const priceError =
    amount !== null && Number.isFinite(amount) && amount >= 0 ? undefined : t('catalogue.priceInvalid')

  function submit() {
    setChecked(true)
    if (nameError || priceError || amount === null) return
    const update: CatalogueItemUpdate = {}
    if (name.trim() !== item.name) update.name = name.trim()
    if (description.trim() !== item.description) update.description = description.trim()
    if (amount !== item.price.amount) update.price = { amount, currency: item.price.currency }
    if (Object.keys(update).length === 0) return onDone()
    save.mutate({ itemId: item.id, update }, { onSuccess: onDone })
  }

  function onKeyDown(event: KeyboardEvent) {
    // Enter on the Save or Cancel button should press that button, not save.
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      event.preventDefault()
      submit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onDone()
    }
  }

  const ids = { name: `item-${item.id}-name`, price: `item-${item.id}-price` }

  return (
    <Tr className="bg-surface-2 hover:bg-surface-2" onKeyDown={onKeyDown}>
      <Td className="min-w-48 py-3 align-top">
        <input
          // Focus follows the click on "Edit", so the user can type straight away.
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label={t('catalogue.name')}
          aria-invalid={checked && Boolean(nameError)}
          aria-describedby={checked && nameError ? `${ids.name}-note` : undefined}
          className={inputClass}
        />
        {checked && <FieldNote id={`${ids.name}-note`} error={nameError} />}
        {save.isError && (
          <p role="alert" className="mt-1 text-xs font-semibold text-critical-ink">
            {t('catalogue.saveFailed')}
          </p>
        )}
      </Td>
      <Td className="min-w-56 py-3 align-top">
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          aria-label={t('catalogue.description')}
          className={inputClass}
        />
      </Td>
      <Td className="py-3 align-top">
        <input
          type="number"
          min={0}
          step="any"
          inputMode="decimal"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          aria-label={t('catalogue.priceInput')}
          aria-invalid={checked && Boolean(priceError)}
          aria-describedby={checked && priceError ? `${ids.price}-note` : undefined}
          className={cn(inputClass, 'w-28 text-right tabular-nums')}
        />
        {checked && <FieldNote id={`${ids.price}-note`} error={priceError} />}
      </Td>
      <Td className="w-px py-3 align-top">
        <div className="flex justify-end gap-1">
          <Button
            size="icon-lg"
            onClick={submit}
            disabled={save.isPending}
            aria-label={t('catalogue.save')}
            title={t('catalogue.save')}
            className="rounded-lg"
          >
            {save.isPending ? <LoaderCircle aria-hidden className="animate-spin" /> : <Check aria-hidden />}
          </Button>
          <Button
            size="icon-lg"
            variant="ghost"
            onClick={onDone}
            aria-label={t('catalogue.cancel')}
            title={t('catalogue.cancel')}
            className="rounded-lg"
          >
            <X aria-hidden />
          </Button>
        </div>
      </Td>
    </Tr>
  )
}
