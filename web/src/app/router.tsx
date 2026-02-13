import { createBrowserRouter, Navigate } from 'react-router'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { CampaignLayout } from '@/features/campaigns/CampaignLayout'
import { CampaignsPage } from '@/features/campaigns/CampaignsPage'
import { InvitePage } from '@/features/invites/InvitePage'
import { JournalPage } from '@/features/journals/JournalPage'
import { JournalIndex } from '@/features/journals/JournalIndex'
import { JournalsPage } from '@/features/journals/JournalsPage'
import { MembersPage } from '@/features/members/MembersPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { AppLayout } from './AppLayout'
import { RouteError } from './RouteError'
import { GuestOnly, RequireAuth } from './guards'

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: '/entrar', element: <LoginPage /> },
          { path: '/criar-conta', element: <RegisterPage /> }
        ]
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: '/', element: <Navigate to="/campanhas" replace /> },
              { path: '/campanhas', element: <CampaignsPage /> },
              { path: '/convite/:code', element: <InvitePage /> },
              {
                path: '/campanhas/:campaignId',
                element: <CampaignLayout />,
                children: [
                  { index: true, element: <Navigate to="diario" replace /> },
                  {
                    path: 'diario',
                    element: <JournalsPage />,
                    children: [
                      { index: true, element: <JournalIndex /> },
                      { path: ':pageId', element: <JournalPage /> }
                    ]
                  },
                  { path: 'jogadores', element: <MembersPage /> },
                  { path: 'ajustes', element: <SettingsPage /> }
                ]
              }
            ]
          }
        ]
      },
      { path: '*', element: <Navigate to="/" replace /> }
    ]
  }
])
