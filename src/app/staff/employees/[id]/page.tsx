'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/components/providers/auth-provider'
import { EmployeeProfile } from '@/components/staff/employee-profile'

export default function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { profile } = useAuthContext()
  const router = useRouter()

  // Only admin, manager, owner can access
  if (profile && !['admin', 'manager', 'owner'].includes(profile.role)) {
    router.replace('/dashboard')
    return null
  }

  return <EmployeeProfile employeeId={id} />
}
