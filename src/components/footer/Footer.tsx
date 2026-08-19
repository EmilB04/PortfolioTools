import { ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'

function GithubIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12" />
    </svg>
  )
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all duration-150"
      style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--border-hover)'
        e.currentTarget.style.color = 'var(--accent)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.color = 'var(--text-muted)'
      }}
    >
      {children}
    </a>
  )
}

export function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    // Horizontal padding mirrors the <main> gutter so the card lines up with page content.
    <footer
      className="pb-6 pt-4"
      style={{ paddingInline: 'var(--gap-page)' }}
    >
      <div
        className="page-container page-container-wide rounded-2xl border px-5 py-4 flex flex-wrap items-center justify-between gap-3"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
          © {year}{' '}
          <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>Emil Berglund</span>
          <span className="mx-2 opacity-40">·</span>
          {t('footer.madeWith')}
          <span className="mx-2 opacity-40">·</span>
          Built with{' '}
          <a
            href="https://claude.ai/code"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium transition-colors duration-150"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            Claude Code
          </a>
        </p>
        <div className="flex items-center gap-2">
          <FooterLink href="https://github.com/EmilB04">
            <GithubIcon size={13} /> GitHub
          </FooterLink>
          <FooterLink href="https://emilb.no">
            <ExternalLink size={13} /> Portfolio
          </FooterLink>
        </div>
      </div>
    </footer>
  )
}
