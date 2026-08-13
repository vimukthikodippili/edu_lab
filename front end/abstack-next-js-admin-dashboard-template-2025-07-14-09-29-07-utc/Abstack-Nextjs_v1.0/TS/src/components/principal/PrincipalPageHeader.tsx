"use client"

import type { LucideIcon } from 'lucide-react'

type PrincipalPageHeaderProps = {
  icon: LucideIcon
  title: string
  subtitle?: string
  tone?: 'brand' | 'critical'
}

const PrincipalPageHeader = ({ icon: Icon, title, subtitle, tone = 'brand' }: PrincipalPageHeaderProps) => {
  return (
    <div className={`edulab-page-header edulab-page-header--${tone}`}>
      <div className="edulab-page-header__icon">
        <Icon size={24} />
      </div>
      <div>
        <h4 className="edulab-page-header__title">{title}</h4>
        {subtitle && <p className="edulab-page-header__subtitle">{subtitle}</p>}
      </div>
    </div>
  )
}

export default PrincipalPageHeader
