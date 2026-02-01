import {
  LayoutDashboard,
  Package,
  Tags,
  MapPin,
  Truck,
  Users,
  UserCog,
  FileText,
  ArrowLeftRight,
  ClipboardList,
  BarChart3,
  Settings,
  ShoppingCart,
  RotateCcw,
  ClipboardCheck,
  Undo2,
  LucideIcon,
} from 'lucide-react'
import type { UserRole } from '@/types'

export interface NavItem {
  name: string
  nameKey: string // Translation key for i18n
  href: string
  icon: LucideIcon
  roles: UserRole[]
}

export interface NavGroup {
  name: string | null // null for standalone items (no section header)
  nameKey: string | null // Translation key for section header
  defaultOpen?: boolean
  items: NavItem[]
}

export const navigationGroups: NavGroup[] = [
  {
    name: null, // Dashboard - standalone, no header
    nameKey: null,
    defaultOpen: true,
    items: [
      {
        name: 'Dashboard',
        nameKey: 'nav.dashboard',
        href: '/',
        icon: LayoutDashboard,
        roles: ['admin', 'manager', 'staff', 'readonly']
      },
    ],
  },
  {
    name: 'Inventory',
    nameKey: 'nav.inventory',
    defaultOpen: true,
    items: [
      {
        name: 'Stock',
        nameKey: 'nav.stock',
        href: '/stock',
        icon: ClipboardList,
        roles: ['admin', 'manager', 'staff', 'readonly']
      },
      {
        name: 'Adjustments',
        nameKey: 'nav.adjustments',
        href: '/adjustments',
        icon: RotateCcw,
        roles: ['admin', 'manager']
      },
      {
        name: 'Cycle Counts',
        nameKey: 'nav.cycleCounts',
        href: '/cycle-counts',
        icon: ClipboardCheck,
        roles: ['admin', 'manager', 'staff']
      },
    ],
  },
  {
    name: 'Transactions',
    nameKey: 'nav.transactions',
    defaultOpen: true,
    items: [
      {
        name: 'Purchase Orders',
        nameKey: 'nav.purchaseOrders',
        href: '/purchase-orders',
        icon: ShoppingCart,
        roles: ['admin', 'manager', 'staff']
      },
      {
        name: 'Shipments',
        nameKey: 'nav.shipments',
        href: '/shipments',
        icon: FileText,
        roles: ['admin', 'manager', 'staff']
      },
      {
        name: 'Transfers',
        nameKey: 'nav.transfers',
        href: '/transfers',
        icon: ArrowLeftRight,
        roles: ['admin', 'manager', 'staff']
      },
      {
        name: 'Returns',
        nameKey: 'nav.returns',
        href: '/returns',
        icon: Undo2,
        roles: ['admin', 'manager']
      },
    ],
  },
  {
    name: 'Master Data',
    nameKey: 'nav.masterData',
    defaultOpen: false, // Collapsed by default - less frequently used
    items: [
      {
        name: 'Products',
        nameKey: 'nav.products',
        href: '/products',
        icon: Package,
        roles: ['admin', 'manager']
      },
      {
        name: 'Categories',
        nameKey: 'nav.categories',
        href: '/categories',
        icon: Tags,
        roles: ['admin', 'manager']
      },
      {
        name: 'Locations',
        nameKey: 'nav.locations',
        href: '/locations',
        icon: MapPin,
        roles: ['admin', 'manager']
      },
      {
        name: 'Suppliers',
        nameKey: 'nav.suppliers',
        href: '/suppliers',
        icon: Truck,
        roles: ['admin', 'manager']
      },
      {
        name: 'Customers',
        nameKey: 'nav.customers',
        href: '/customers',
        icon: Users,
        roles: ['admin', 'manager']
      },
    ],
  },
  {
    name: null, // Reports - standalone
    nameKey: null,
    defaultOpen: true,
    items: [
      {
        name: 'Reports',
        nameKey: 'nav.reports',
        href: '/reports',
        icon: BarChart3,
        roles: ['admin', 'manager']
      },
    ],
  },
  {
    name: 'Admin',
    nameKey: 'nav.admin',
    defaultOpen: false,
    items: [
      {
        name: 'Team',
        nameKey: 'nav.users',
        href: '/users',
        icon: UserCog,
        roles: ['admin', 'manager']
      },
      {
        name: 'Settings',
        nameKey: 'nav.settings',
        href: '/settings',
        icon: Settings,
        roles: ['admin', 'manager', 'staff', 'readonly']
      },
    ],
  },
]

// Helper function to filter navigation by role
export function getNavigationForRole(role: UserRole): NavGroup[] {
  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0)
}
