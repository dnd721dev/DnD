import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 text-center">
      <p className="eyebrow">Lost in the mists</p>
      <h1 className="page-title text-4xl">404</h1>
      <p className="text-sm" style={{ color: 'var(--text-mid)' }}>
        This page doesn&apos;t exist — or it&apos;s hidden behind a fog of war
        you haven&apos;t revealed yet.
      </p>
      <div className="mt-2 flex gap-3">
        <Link href="/" className="btn btn-primary">
          Return Home
        </Link>
        <Link href="/campaigns" className="btn btn-ghost">
          My Campaigns
        </Link>
      </div>
    </div>
  )
}
