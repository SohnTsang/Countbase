'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react'
import { X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUserRole } from '@/contexts/user-context'
import { getNavigationForRole } from '@/config/navigation'

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname()
  const role = useUserRole()
  const navigation = getNavigationForRole(role)

  // Track which sections are expanded (all open by default on mobile for easier access)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    navigation.forEach((group) => {
      if (group.name) {
        initial[group.name] = true // All expanded by default on mobile
      }
    })
    return initial
  })

  const toggleSection = (sectionName: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }))
  }

  const isActive = (href: string) => {
    return pathname === href || (href !== '/' && pathname.startsWith(href))
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

              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                <div className="flex h-16 shrink-0 items-center">
                  <span className="text-xl font-bold">Inventory</span>
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
                              className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500"
                            >
                              {group.name}
                              <ChevronDown
                                className={cn(
                                  'h-4 w-4 transition-transform duration-200',
                                  !expandedSections[group.name] && '-rotate-90'
                                )}
                              />
                            </button>
                            {expandedSections[group.name] && (
                              <ul className="mt-1 space-y-1">
                                {group.items.map((item) => {
                                  const active = isActive(item.href)
                                  return (
                                    <li key={item.name}>
                                      <Link
                                        href={item.href}
                                        onClick={onClose}
                                        className={cn(
                                          'group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6',
                                          active
                                            ? 'bg-gray-100 text-gray-900'
                                            : 'text-gray-700 hover:bg-gray-50'
                                        )}
                                      >
                                        <item.icon className="h-5 w-5 shrink-0" />
                                        {item.name}
                                      </Link>
                                    </li>
                                  )
                                })}
                              </ul>
                            )}
                          </div>
                        ) : (
                          // Standalone items
                          <ul className="space-y-1">
                            {group.items.map((item) => {
                              const active = isActive(item.href)
                              return (
                                <li key={item.name}>
                                  <Link
                                    href={item.href}
                                    onClick={onClose}
                                    className={cn(
                                      'group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6',
                                      active
                                        ? 'bg-gray-100 text-gray-900'
                                        : 'text-gray-700 hover:bg-gray-50'
                                    )}
                                  >
                                    <item.icon className="h-5 w-5 shrink-0" />
                                    {item.name}
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
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}
