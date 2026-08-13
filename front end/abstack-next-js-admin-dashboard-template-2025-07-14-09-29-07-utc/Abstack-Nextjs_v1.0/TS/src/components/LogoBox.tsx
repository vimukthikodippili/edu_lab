import Link from 'next/link'
import { EduLabLogo } from '@/components/branding/EduLabLogo'

// The mark sits on its own white chip and is theme-agnostic by design, so the same markup
// renders inside both .logo-light and .logo-dark — the surrounding CSS (_layout.scss) decides
// which span is actually visible per data-bs-theme/data-menu-color/data-topbar-color; this
// component doesn't need to know which. Sized via EduLabLogo's own `size` prop rather than the
// .logo-lg/.logo-sm `img` height rules, since those target <img>, not the <svg> mark renders.
const LogoBox = () => {
  return (
    <Link href="/" className="logo">
      <span className="logo-light">
        <span className="logo-lg">
          <EduLabLogo variant="full" size={22} />
        </span>
        <span className="logo-sm">
          <EduLabLogo variant="mark" size={28} />
        </span>
      </span>
      <span className="logo-dark">
        <span className="logo-lg">
          <EduLabLogo variant="full" size={22} />
        </span>
        <span className="logo-sm">
          <EduLabLogo variant="mark" size={28} />
        </span>
      </span>
    </Link>
  )
}

export default LogoBox
