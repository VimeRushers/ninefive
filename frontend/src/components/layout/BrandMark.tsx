/** The ninefive mark: a lime tile with an N, same as the favicon. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect width="32" height="32" rx="9" fill="var(--lime-500)" />
      <path
        d="M10.5 23V9l11 14V9"
        fill="none"
        stroke="var(--on-lime)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
