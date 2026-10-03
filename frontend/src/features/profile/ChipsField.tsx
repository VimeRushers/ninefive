import { Plus, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { FieldNote } from './Field'
import { inputClass } from './form'

interface ChipsFieldProps {
  id: string
  label: string
  hint?: string
  values: string[]
  onChange: (values: string[]) => void
  /** Accessible name of the add button, e.g. "Add CPV code". Starts with the visible "Add". */
  addLabel: string
  placeholder?: string
  /** Returns a message when a value can't be added. */
  validate?: (value: string) => string | null
  /** Splits a pasted list, e.g. several CPV codes at once. */
  separator?: RegExp
  /** Offered while typing; the user can still type anything. */
  suggestions?: readonly string[]
}

/** A list of short values with an input to add more (Enter or the button) and × to remove one. */
export function ChipsField({
  id,
  label,
  hint,
  values,
  onChange,
  addLabel,
  placeholder,
  validate,
  separator,
  suggestions,
}: ChipsFieldProps) {
  const { t } = useTranslation('profile')
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const listId = suggestions ? `${id}-options` : undefined
  const noteId = error || hint ? `${id}-note` : undefined
  const has = (list: string[], value: string) =>
    list.some((item) => item.toLocaleLowerCase() === value.toLocaleLowerCase())

  function add() {
    const parts = (separator ? text.split(separator) : [text]).map((part) => part.trim()).filter(Boolean)
    const added: string[] = []
    const rejected: string[] = []
    let message: string | null = null
    for (const part of parts) {
      const problem = validate?.(part)
      if (problem) {
        rejected.push(part)
        message = problem
      } else if (has(values, part) || has(added, part)) {
        message ??= t('chips.duplicate', { value: part })
      } else {
        added.push(part)
      }
    }
    if (added.length > 0) onChange([...values, ...added])
    // Invalid values stay in the box so the user can fix them.
    setText(rejected.join(', '))
    setError(message)
  }

  function remove(value: string) {
    onChange(values.filter((item) => item !== value))
    inputRef.current?.focus()
  }

  return (
    <div className="grid content-start gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      {values.length > 0 ? (
        <ul aria-label={label} className="flex flex-wrap gap-1.5">
          {values.map((value) => (
            <li
              key={value}
              className="inline-flex animate-pop-in items-center gap-0.5 rounded-md bg-surface-3 py-0.5 pr-0.5 pl-2 text-xs font-semibold text-ink-2"
            >
              {value}
              <button
                type="button"
                onClick={() => remove(value)}
                aria-label={t('chips.remove', { value })}
                className="grid size-5 place-items-center rounded transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <X aria-hidden className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-faint">{t('chips.none')}</p>
      )}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          id={id}
          value={text}
          list={listId}
          placeholder={placeholder}
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={noteId}
          onChange={(event) => {
            setText(event.target.value)
            setError(null)
          }}
          onKeyDown={(event) => {
            // Enter adds the value instead of submitting the whole form.
            if (event.key === 'Enter') {
              event.preventDefault()
              add()
            }
          }}
          className={inputClass}
        />
        <Button
          type="button"
          variant="outline"
          onClick={add}
          disabled={!text.trim()}
          aria-label={addLabel}
          className="h-9 rounded-lg"
        >
          <Plus aria-hidden />
          {t('chips.add')}
        </Button>
      </div>
      {suggestions && (
        <datalist id={listId}>
          {suggestions
            .filter((option) => !has(values, option))
            .map((option) => (
              <option key={option} value={option} />
            ))}
        </datalist>
      )}
      <FieldNote id={noteId} hint={hint} error={error ?? undefined} />
    </div>
  )
}
