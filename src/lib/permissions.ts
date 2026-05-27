export const APP_PERMISSIONS = [
  'dashboard',
  'inbox',
  'contacts',
  'tasks',
  'crm',
  'automations',
  'settings',
] as const;

export type AppPermission = (typeof APP_PERMISSIONS)[number];

export type TeamRole =
  | 'administrator'
  | 'attendant'
  | 'commercial'
  | 'financial'
  | 'viewer';

export const ROLE_LABELS: Record<TeamRole, string> = {
  administrator: 'Administrador',
  attendant: 'Atendente',
  commercial: 'Comercial',
  financial: 'Financeiro',
  viewer: 'Visualização',
};

export const PERMISSION_LABELS: Record<AppPermission, string> = {
  dashboard: 'Dashboard',
  inbox: 'Inbox',
  contacts: 'Contatos',
  tasks: 'Tarefas',
  crm: 'CRM',
  automations: 'Automações',
  settings: 'Configurações',
};

export const DEFAULT_ROLE_PERMISSIONS: Record<TeamRole, AppPermission[]> = {
  administrator: [...APP_PERMISSIONS],
  attendant: ['dashboard', 'inbox', 'contacts', 'tasks'],
  commercial: ['dashboard', 'inbox', 'contacts', 'tasks', 'crm', 'automations'],
  financial: ['dashboard', 'contacts', 'crm'],
  viewer: ['dashboard', 'inbox', 'contacts', 'tasks', 'crm'],
};

export function normalizePermissions(value: unknown): AppPermission[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is AppPermission =>
    APP_PERMISSIONS.includes(item as AppPermission)
  );
}

export function routePermission(pathname: string): AppPermission | null {
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/inbox')) return 'inbox';
  if (pathname.startsWith('/contacts')) return 'contacts';
  if (pathname.startsWith('/tasks')) return 'tasks';
  if (pathname.startsWith('/crm') || pathname.startsWith('/pipelines')) return 'crm';
  if (
    pathname.startsWith('/automations') ||
    pathname.startsWith('/flows') ||
    pathname.startsWith('/broadcasts')
  ) {
    return 'automations';
  }
  if (pathname.startsWith('/settings')) return 'settings';
  return null;
}
