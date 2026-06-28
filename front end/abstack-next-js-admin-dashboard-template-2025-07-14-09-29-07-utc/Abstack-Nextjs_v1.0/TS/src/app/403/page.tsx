'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import logoDark from '@/assets/images/logo-dark.png'
import logo from '@/assets/images/logo.png'
import { ROLE_HOME_PATHS } from '@/lib/auth/roles'
import type { Role } from '@/lib/auth/roles'

export default function ForbiddenPage() {
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const { data: session } = useSession()
  const router = useRouter()

  const role = session?.user?.role as Role | undefined
  const homeUrl = role ? ROLE_HOME_PATHS[role] : '/auth/login'

  return (
    <div className="d-flex min-vh-100 justify-content-center align-items-center bg-light">
      <div className="text-center px-4" style={{ maxWidth: 480 }}>
        <div className="mb-4">
          <Image src={logoDark} alt="SIMS" height={36} className="logo-dark" />
          <Image src={logo} alt="SIMS" height={36} className="logo-light" />
        </div>

        <div className="mb-4">
          <span
            className="d-flex align-items-center justify-content-center rounded-circle bg-warning bg-opacity-10 mx-auto mb-3"
            style={{ width: 80, height: 80 }}
          >
            <i className="ri-lock-2-line text-warning" style={{ fontSize: 36 }} />
          </span>
          <h1 className="fw-bold text-dark mb-1" style={{ fontSize: 64, lineHeight: 1 }}>
            403
          </h1>
          <h4 className="fw-semibold mb-2">Access Denied</h4>
          <p className="text-muted fs-14 mb-0">
            You don't have permission to view this page.
            {from && (
              <>
                {' '}
                <span className="text-muted fw-medium">{from}</span> is restricted to a different role.
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary fw-semibold px-4"
          onClick={() => router.push(homeUrl)}
        >
          <i className="ri-home-4-line me-2" />
          Go to my dashboard
        </button>
      </div>
    </div>
  )
}
