import ebBlack from '../assets/icons/eb_black_sm.png'

interface BrandMarkProps {
  /** Hide the wordmark and render the badge only (collapsed sidebar, mobile header). */
  iconOnly?: boolean
  className?: string
}

/**
 * The shared "EB · PortfolioTools" brand badge. Uses the same black EB mark as the
 * browser tab icon and the sibling portfolio projects, always on a white pill so the
 * black glyph keeps its contrast in both themes.
 */
export function BrandMark({ iconOnly = false, className = '' }: BrandMarkProps) {
  return (
    <a
      href="https://emilb.no"
      target="_blank"
      rel="noopener noreferrer"
      className={`flex min-w-0 shrink-0 items-center gap-2 rounded-full border bg-white text-black transition-colors duration-300 ${
        iconOnly ? 'h-8 w-8 justify-center' : 'h-10 pl-1 pr-1'
      } ${className}`}
      style={{ borderColor: 'var(--border)' }}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
        <img src={ebBlack} alt="" width={32} height={32} className="h-full w-full object-contain" />
      </span>
      {!iconOnly && (
        <span className="pr-3 text-[15px] font-bold tracking-tight whitespace-nowrap">
          PortfolioTools
        </span>
      )}
      <span className="sr-only">PortfolioTools — emilb.no</span>
    </a>
  )
}
