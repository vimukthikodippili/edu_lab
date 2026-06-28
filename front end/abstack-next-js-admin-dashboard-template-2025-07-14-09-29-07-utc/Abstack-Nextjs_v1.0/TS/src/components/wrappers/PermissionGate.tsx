'use client'
import type { ReactNode } from 'react'
import { useAuthStore } from '@/stores/authStore'
import type { Permission } from '@/lib/auth/permissions'

interface PermissionGateProps {
  permission: Permission
  fallback?: ReactNode
  children: ReactNode
}

export default function PermissionGate({ permission, fallback = null, children }: PermissionGateProps) {
  const hasPermission = useAuthStore((state) => state.hasPermission)
  if (!hasPermission(permission)) return <>{fallback}</>
  return <>{children}</>
}
