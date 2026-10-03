import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCatalogue, useUpdateProfile } from '@/api/profile'
import type { CompanyLookup, ProfileOut } from '@/api/types'
import { CompletionPanel } from './CompletionPanel'
import {
  changesFrom,
  completedItems,
  type CompletionItem,
  type DraftField,
  type ProfileDraft,
  toDraft,
  validate,
} from './draft'
import { FIELD_ID, focusField, openPricelistPicker } from './form'
import { LeaveGuard } from './LeaveGuard'
import { CompanySection, DescriptionSection, EligibilitySection, MatchingSection } from './ProfileSections'
import { SaveBar } from './SaveBar'

const COMPLETION_TARGET: Record<Exclude<CompletionItem, 'catalogue'>, string> = {
  idno: FIELD_ID.idno,
  name: FIELD_ID.name,
  description: FIELD_ID.description,
  cpv: FIELD_ID.cpv,
  region: FIELD_ID.region,
  turnover: FIELD_ID.turnover,
  employees: FIELD_ID.employees,
}

/** Min and max are checked against each other, so leaving one shows errors on both. */
const TOUCHED_TOGETHER: Partial<Record<DraftField, DraftField[]>> = {
  budget_min: ['budget_min', 'budget_max'],
  budget_max: ['budget_min', 'budget_max'],
}

/**
 * The completion meter and the profile form. Edits stay local until "Save profile",
 * which sends only the changed fields.
 */
export function ProfileEditor({ profile }: { profile: ProfileOut }) {
  const { t } = useTranslation('profile')
  const save = useUpdateProfile()
  const catalogue = useCatalogue()
  const [draft, setDraft] = useState<ProfileDraft>(() => toDraft(profile))
  const [touched, setTouched] = useState<Partial<Record<DraftField, boolean>>>({})

  const errors = validate(draft)
  const dirty = Object.keys(changesFrom(profile, draft)).length > 0
  const valid = Object.keys(errors).length === 0
  const visibleError = (field: DraftField) => {
    const error = touched[field] ? errors[field] : undefined
    return error && t(`errors.${error}`)
  }
  const showsErrors = Object.keys(errors).some((field) => touched[field as DraftField])

  function update(change: (draft: ProfileDraft) => ProfileDraft) {
    setDraft(change)
    // A new edit makes the last "Saved" or error out of date.
    if (!save.isIdle && !save.isPending) save.reset()
  }

  const set = <K extends DraftField>(field: K, value: ProfileDraft[K]) =>
    update((current) => ({ ...current, [field]: value }))

  const touch = (field: DraftField) =>
    setTouched((current) => {
      const next = { ...current }
      for (const name of TOUCHED_TOGETHER[field] ?? [field]) next[name] = true
      return next
    })

  function fillFromLookup(company: CompanyLookup) {
    update((current) => ({
      ...current,
      name: company.name,
      regions:
        company.region && !current.regions.includes(company.region)
          ? [...current.regions, company.region]
          : current.regions,
    }))
    // The fill button goes away once the form matches, so keep focus on what changed.
    requestAnimationFrame(() => focusField(FIELD_ID.name))
  }

  function discard() {
    setDraft(toDraft(profile))
    setTouched({})
    save.reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!dirty || !valid || save.isPending) return
    const submitted = draft
    save.mutate(changesFrom(profile, draft), {
      onSuccess: (saved) => {
        // Keep edits made while saving; otherwise show the profile as the server has it.
        setDraft((current) => (current === submitted ? toDraft(saved) : current))
        setTouched({})
      },
    })
  }

  const section = { draft, set, touch, error: visibleError }

  return (
    <div className="space-y-4">
      <CompletionPanel
        done={completedItems(draft, catalogue.data?.length ?? 0)}
        onAction={(item) =>
          item === 'catalogue' ? openPricelistPicker() : focusField(COMPLETION_TARGET[item])
        }
      />
      <form noValidate onSubmit={submit} aria-label={t('title')} className="space-y-4">
        <div className="stagger grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CompanySection {...section} onFill={fillFromLookup} />
          <DescriptionSection {...section} />
          <MatchingSection {...section} />
          <EligibilitySection {...section} />
        </div>
        <SaveBar
          dirty={dirty}
          showsErrors={showsErrors}
          canSave={dirty && valid && !save.isPending}
          saving={save.isPending}
          saved={save.isSuccess}
          failed={save.isError}
          onDiscard={discard}
        />
      </form>
      <LeaveGuard when={dirty} />
    </div>
  )
}
