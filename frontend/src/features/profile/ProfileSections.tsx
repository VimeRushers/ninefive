import { useTranslation } from 'react-i18next'
import type { CompanyLookup } from '@/api/types'
import { Panel, PanelBody, PanelHeader } from '@/components/shared/Panel'
import { formatMoney } from '@/lib/format'
import { ChipsField } from './ChipsField'
import { CompanyLookupResult } from './CompanyLookupResult'
import { CPV_PATTERN, type DraftField, type ProfileDraft, parseNumber } from './draft'
import { Field } from './Field'
import { FIELD_ID, inputClass } from './form'
import { REGIONS } from './regions'

export interface SectionProps {
  draft: ProfileDraft
  set: <K extends DraftField>(field: K, value: ProfileDraft[K]) => void
  /** Marks a field as visited, so its error shows. */
  touch: (field: DraftField) => void
  /** The translated error of a visited field. */
  error: (field: DraftField) => string | undefined
}

/** Props shared by every text and number input of the form. */
function bind({ draft, set, touch }: SectionProps, field: keyof StringFields) {
  return {
    value: draft[field],
    onChange: (event: { target: { value: string } }) => set(field, event.target.value),
    onBlur: () => touch(field),
    className: inputClass,
  }
}

type StringFields = { [K in DraftField as ProfileDraft[K] extends string ? K : never]: string }

/** The amount in words under a money field, so a missing zero is easy to spot. */
function useMoneyHint() {
  const { i18n } = useTranslation()
  return (text: string) => {
    const amount = parseNumber(text)
    return amount !== null && Number.isFinite(amount) && amount >= 0
      ? formatMoney({ amount, currency: 'MDL' }, i18n.language)
      : undefined
  }
}

export function CompanySection(props: SectionProps & { onFill: (company: CompanyLookup) => void }) {
  const { t } = useTranslation('profile')
  const { draft, error, onFill } = props
  return (
    <Panel>
      <PanelHeader title={t('company.title')} />
      <PanelBody className="grid gap-4">
        <Field
          id={FIELD_ID.idno}
          label={t('company.idno')}
          hint={t('company.idnoHint')}
          error={error('idno')}
        >
          {(control) => (
            <input
              {...control}
              {...bind(props, 'idno')}
              inputMode="numeric"
              autoComplete="off"
              maxLength={13}
              placeholder="1003600012345"
            />
          )}
        </Field>
        <CompanyLookupResult
          idno={draft.idno.trim()}
          name={draft.name}
          regions={draft.regions}
          onFill={onFill}
        />
        <Field id={FIELD_ID.name} label={t('company.name')} error={error('name')}>
          {(control) => <input {...control} {...bind(props, 'name')} autoComplete="organization" />}
        </Field>
      </PanelBody>
    </Panel>
  )
}

export function DescriptionSection(props: SectionProps) {
  const { t } = useTranslation('profile')
  return (
    <Panel>
      <PanelHeader title={t('aiDescription.title')} />
      <PanelBody className="flex flex-1 flex-col">
        <Field
          id={FIELD_ID.description}
          label={t('aiDescription.label')}
          hint={t('aiDescription.hint')}
          error={props.error('description')}
          className="flex-1 grid-rows-[auto_1fr_auto] content-stretch"
        >
          {(control) => (
            <textarea
              {...control}
              {...bind(props, 'description')}
              rows={8}
              className="h-full min-h-40 w-full resize-y rounded-lg border bg-card px-2.5 py-2 text-sm leading-relaxed outline-none transition-[border-color,box-shadow] duration-200 focus:border-primary focus:ring-3 focus:ring-ring/30 aria-invalid:border-critical"
            />
          )}
        </Field>
      </PanelBody>
    </Panel>
  )
}

export function MatchingSection(props: SectionProps) {
  const { t } = useTranslation('profile')
  const { draft, set, error } = props
  const moneyHint = useMoneyHint()
  return (
    <Panel>
      <PanelHeader title={t('matching.title')} />
      <PanelBody className="grid gap-5">
        <ChipsField
          id={FIELD_ID.cpv}
          label={t('matching.cpv')}
          hint={t('matching.cpvHint')}
          values={draft.cpv_codes}
          onChange={(values) => set('cpv_codes', values)}
          addLabel={t('matching.addCpv')}
          placeholder="30213000-5"
          separator={/[\s,;]+/}
          validate={(value) => (CPV_PATTERN.test(value) ? null : t('errors.cpvFormat'))}
        />
        <ChipsField
          id={FIELD_ID.region}
          label={t('matching.regions')}
          hint={t('matching.regionsHint')}
          values={draft.regions}
          onChange={(values) => set('regions', values)}
          addLabel={t('matching.addRegion')}
          suggestions={REGIONS}
        />
        <fieldset className="grid gap-1.5">
          <legend className="mb-1.5 text-xs font-semibold text-muted-foreground">
            {t('matching.budget')}
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <Field
              id={FIELD_ID.budgetMin}
              label={t('matching.budgetMin')}
              hint={moneyHint(draft.budget_min)}
              error={error('budget_min')}
            >
              {(control) => (
                <input {...control} {...bind(props, 'budget_min')} type="number" min={0} step={1000} />
              )}
            </Field>
            <Field
              id={FIELD_ID.budgetMax}
              label={t('matching.budgetMax')}
              hint={moneyHint(draft.budget_max)}
              error={error('budget_max')}
            >
              {(control) => (
                <input {...control} {...bind(props, 'budget_max')} type="number" min={0} step={1000} />
              )}
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">{t('matching.budgetHint')}</p>
        </fieldset>
      </PanelBody>
    </Panel>
  )
}

export function EligibilitySection(props: SectionProps) {
  const { t } = useTranslation('profile')
  const { draft, set, error } = props
  const moneyHint = useMoneyHint()
  return (
    <Panel>
      <PanelHeader title={t('eligibility.title')} />
      <PanelBody className="grid gap-5">
        <p className="-mt-1 text-sm text-muted-foreground">{t('eligibility.hint')}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id={FIELD_ID.turnover}
            label={t('eligibility.turnover')}
            hint={moneyHint(draft.annual_turnover)}
            error={error('annual_turnover')}
          >
            {(control) => (
              <input {...control} {...bind(props, 'annual_turnover')} type="number" min={0} step={1000} />
            )}
          </Field>
          <Field id={FIELD_ID.employees} label={t('eligibility.employees')} error={error('employee_count')}>
            {(control) => (
              <input {...control} {...bind(props, 'employee_count')} type="number" min={0} step={1} />
            )}
          </Field>
        </div>
        <ChipsField
          id={FIELD_ID.licenses}
          label={t('eligibility.licenses')}
          values={draft.licenses}
          onChange={(values) => set('licenses', values)}
          addLabel={t('eligibility.addLicense')}
        />
        <ChipsField
          id={FIELD_ID.certifications}
          label={t('eligibility.certifications')}
          values={draft.certifications}
          onChange={(values) => set('certifications', values)}
          addLabel={t('eligibility.addCertification')}
        />
      </PanelBody>
    </Panel>
  )
}
