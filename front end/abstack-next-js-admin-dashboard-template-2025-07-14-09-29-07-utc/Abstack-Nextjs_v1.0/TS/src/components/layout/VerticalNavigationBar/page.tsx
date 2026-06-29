import FallbackLoading from '@/components/FallbackLoading'
import LogoBox from '@/components/LogoBox'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import SimplebarReactClient from '@/components/wrappers/SimplebarReactClient'
import { useLayoutContext } from '@/context/useLayoutContext'
import { getMenuItems } from '@/helpers/Manu'
import { useAuthStore } from '@/stores/authStore'
import { Suspense } from 'react'
import AppMenu from './components/AppMenu'

const VerticalNavigationBar = () => {
  const role = useAuthStore((s) => s.user?.role)
  const menuItems = getMenuItems(role)

  const { toggleBackdrop } = useLayoutContext()
  return (
    <div className="sidenav-menu">
      <LogoBox />
      <button onClick={toggleBackdrop} className="button-close-fullsidebar">
        <IconifyIcon icon="ri:close-line" className="align-middle" />
      </button>
      <SimplebarReactClient data-simplebar>
        <Suspense fallback={<FallbackLoading />}>
          <AppMenu menuItems={menuItems} />
          <div className="clearfix" />
        </Suspense>
      </SimplebarReactClient>
    </div>
  )
}

export default VerticalNavigationBar
