'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUserRole } from '@/contexts/user-context'
import { getNavigationForRole, type NavGroup } from '@/config/navigation'
import { useTranslation } from '@/lib/i18n'

// Store collapse state in localStorage
const STORAGE_KEY = 'sidebar-collapsed-sections'

function getStoredCollapseState(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function setStoredCollapseState(state: Record<string, boolean>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage errors
  }
}

export function Sidebar() {
  const pathname = usePathname()
  const role = useUserRole()
  const navigation = getNavigationForRole(role)
  const { t } = useTranslation()

  // Initialize collapse state from localStorage or defaults
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    const stored = getStoredCollapseState()
    const initialState: Record<string, boolean> = {}

    navigation.forEach((group) => {
      if (group.name) {
        // Use stored value if available, otherwise use default
        initialState[group.name] = stored[group.name] ?? !group.defaultOpen
      }
    })

    return initialState
  })

  const toggleSection = (sectionName: string) => {
    setCollapsedSections((prev) => {
      const newState = { ...prev, [sectionName]: !prev[sectionName] }
      setStoredCollapseState(newState)
      return newState
    })
  }

  const isActive = (href: string) => {
    return pathname === href || (href !== '/' && pathname.startsWith(href))
  }

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
        <div className="flex h-16 shrink-0 items-center">
          <span className="text-xl font-bold text-gray-900">Inventory</span>
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-1">
            {navigation.map((group, groupIndex) => (
              <li key={group.name || `group-${groupIndex}`}>
                {group.name ? (
                  // Collapsible section
                  <div className="mt-4 first:mt-0">
                    <button
                      onClick={() => toggleSection(group.name!)}
                      className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700"
                    >
                      {group.nameKey ? t(group.nameKey) : group.name}
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform duration-200',
                          collapsedSections[group.name] && '-rotate-90'
                        )}
                      />
                    </button>
                    <ul
                      className={cn(
                        'mt-1 space-y-1 overflow-hidden transition-all duration-200',
                        collapsedSections[group.name] ? 'max-h-0' : 'max-h-96'
                      )}
                    >
                      {group.items.map((item) => {
                        const active = isActive(item.href)
                        return (
                          <li key={item.name}>
                            <Link
                              href={item.href}
                              className={cn(
                                'group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6',
                                active
                                  ? 'bg-gray-100 text-gray-900'
                                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                              )}
                            >
                              <item.icon
                                className={cn(
                                  'h-5 w-5 shrink-0',
                                  active ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-900'
                                )}
                              />
                              {item.nameKey ? t(item.nameKey) : item.name}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ) : (
                  // Standalone items (no section header)
                  <ul className="space-y-1">
                    {group.items.map((item) => {
                      const active = isActive(item.href)
                      return (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            className={cn(
                              'group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6',
                              active
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                            )}
                          >
                            <item.icon
                              className={cn(
                                'h-5 w-5 shrink-0',
                                active ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-900'
                              )}
                            />
                            {item.nameKey ? t(item.nameKey) : item.name}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}
