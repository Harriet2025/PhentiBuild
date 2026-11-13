/** The official PhB mark — same artwork as backend/components/logo.php. */
export function Logo({ className = '', size = 48 }: { className?: string; size?: number }) {
  return (
    <img
      src="/assets/images/phb-logo.png"
      alt="PhentiBuild"
      className={className || undefined}
      width={size}
      height={size}
    />
  )
}
