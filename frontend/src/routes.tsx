import { Navigate, type RouteObject } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { RouteError } from '@/components/layout/RouteError'
import { NotFoundState } from '@/components/shared/states'
import { CompetitorsPage } from '@/features/analyzer/CompetitorsPage'
import { BoardPage } from '@/features/board/BoardPage'
import { BuyerPage } from '@/features/integrity/BuyerPage'
import { IntegrityPage } from '@/features/integrity/IntegrityPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { TenderDetailsPage } from '@/features/tender/TenderDetailsPage'
import { TenderLayout } from '@/features/tender/TenderLayout'

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="/board" replace /> },
      { path: 'board', element: <BoardPage /> },
      { path: 'profile', element: <ProfilePage /> },
      {
        path: 'tenders/:tenderId',
        element: <TenderLayout />,
        children: [
          { index: true, element: <TenderDetailsPage /> },
          { path: 'competitors', element: <CompetitorsPage /> },
          { path: 'integrity', element: <IntegrityPage /> },
        ],
      },
      { path: 'buyers/:buyerId', element: <BuyerPage /> },
      { path: '*', element: <NotFoundState /> },
    ],
  },
]
