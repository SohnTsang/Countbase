'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react'
import { X, AlertTriangle, Home, Shield, Activity, BarChart3, Server, Users, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  disabled?: boolean
}

interface NavGroup {
  name: string
  items: NavItem[]
}

const adminNavigation: NavGroup[] = [
  {
    name: 'Overview',
    items: [
      { name: 'Dashboard', href: '/admin', icon: Home },
      { name: 'Error Logs', href: '/admin/error-logs', icon: AlertTriangle },
    ],
  },
  {
    name: 'System',
    items: [
      { name: 'System Health', href: '/admin/health', icon: Activity, disabled: true },
      { name: 'Performance', href: '/admin/performance', icon: BarChart3, disabled: true },
      { name: 'Services', href: '/admin/services', icon: Server, disabled: true },
    ],
  },
  {
    name: 'Management',
    items: [
      { name: 'All Tenants', href: '/admin/tenants', icon: Users, disabled: true },
      { name: 'Admin Settings', href: '/admin/settings', icon: Settings, disabled: true },
    ],
  },
]

interface AdminMobileNavProps {
  open: boolean
  onClose: () => void
}

export function AdminMobileNav({ open, onClose }: AdminMobileNavProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin'
    }
    return pathname.startsWith(href)
  }

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50 lg:hidden" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="transition-opacity ease-linear duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/80" />
        </TransitionChild>

        <div className="fixed inset-0 flex">
          <TransitionChild
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <DialogPanel className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                <button type="button" className="-m-2.5 p-2.5" onClick={onClose}>
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>

              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-slate-900 px-6 pb-4">
                <div className="flex h-16 shrink-0 items-center gap-2">
                  <Shield className="h-6 w-6 text-emerald-400" />
                  <span className="text-xl font-bold text-white">Admin Panel</span>
                </div>

                {/* Back to Dashboard */}
                <div className="-mx-2">
                  <Link
                    href="/"
                    onClick={onClose}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
                  >
                    <Home className="h-4 w-4" />
                    Back to Dashboard
                  </Link>
                </div>

                <nav className="flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    {adminNavigation.map((group) => (
                      <li key={group.name}>
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          {group.name}
                        </div>
                        <ul role="list" className="mt-2 space-y-1">
                          {group.items.map((item) => {
                            const active = isActive(item.href)
                            const disabled = item.disabled

                            if (disabled) {
                              return (
                                <li key={item.name}>
                                  <div className="group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 text-slate-600 cursor-not-allowed">
                                    <item.icon className="h-5 w-5 shrink-0 text-slate-600" />
                                    {item.name}
                                    <span className="ml-auto text-xs">Soon</span>
                                  </div>
                                </li>
                              )
                            }

                            return (
                              <li key={item.name}>
                                <Link
                                  href={item.href}
                                  onClick={onClose}
                                  className={cn(
                                    'group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6',
                                    active
                                      ? 'bg-emerald-600 text-white'
                                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                  )}
                                >
                                  <item.icon
                                    className={cn(
                                      'h-5 w-5 shrink-0',
                                      active ? 'text-white' : 'text-slate-400 group-hover:text-white'
                                    )}
                                  />
                                  {item.name}
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}
