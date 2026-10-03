import { useTranslation } from 'react-i18next'
import { useProfile } from '@/api/profile'
import { PageHeader } from '@/components/shared/PageHeader'
import { QueryState } from '@/components/shared/states'
import { CataloguePanel } from './CataloguePanel'
import { PricelistsPanel } from './PricelistsPanel'
import { ProfileEditor } from './ProfileEditor'

/** The company profile the AI matches tenders against: the form, then the pricelists and catalogue. */
export function ProfilePage() {
  const { t } = useTranslation('profile')
  const query = useProfile()

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <QueryState query={query}>
        {(profile) => (
          <div className="space-y-4">
            <ProfileEditor profile={profile} />
            <div className="stagger grid grid-cols-1 gap-4 xl:grid-cols-5">
              <PricelistsPanel className="xl:col-span-2" />
              <CataloguePanel className="xl:col-span-3" />
            </div>
          </div>
        )}
      </QueryState>
    </>
  )
}
