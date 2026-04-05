export type StudentHubTab = 'overview' | 'profile' | 'certificates' | 'history'

export const studentHubTabRoutes: Record<StudentHubTab, string> = {
  overview: '/dashboard',
  profile: '/profile',
  certificates: '/my-certificates',
  history: '/history',
}

export const studentHubRouteAliases = ['/dashboard', '/profile', '/history', '/my-certificates', '/certificates']
