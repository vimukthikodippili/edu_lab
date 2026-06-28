'use client'
import { useAuthStore } from '@/stores/authStore'
import type { Permission } from '@/lib/auth/permissions'

export function usePermission(permission: Permission): boolean {
  return useAuthStore((state) => state.hasPermission(permission))
}

export function usePermissions(permissions: Permission[]): boolean {
  const hasPermission = useAuthStore((state) => state.hasPermission)
  return permissions.every(hasPermission)
}

export function useAnyPermission(permissions: Permission[]): boolean {
  const hasPermission = useAuthStore((state) => state.hasPermission)
  return permissions.some(hasPermission)
}
