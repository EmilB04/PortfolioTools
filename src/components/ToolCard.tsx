import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

interface ToolCardProps {
  title: string
  description: string
  badge: string
  icon: React.ReactNode
  href: string
  headingLevel?: 3 | 4
}

export function ToolCard({ title, description, badge, icon, href, headingLevel = 3 }: ToolCardProps) {
  const Heading = headingLevel === 4 ? 'h4' : 'h3'
  return (
    <Link to={href} className="directory-card group">
      <div className="directory-card-top">
        <span className="directory-card-icon" aria-hidden="true">{icon}</span>
        <ArrowUpRight size={18} className="directory-card-arrow" aria-hidden="true" />
      </div>
      <Heading>{title}</Heading>
      <p>{description}</p>
      <span className="directory-card-badge">{badge}</span>
    </Link>
  )
}
