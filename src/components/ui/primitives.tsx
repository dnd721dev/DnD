'use client'

// DND721 shared UI primitives — the vocabulary every redesigned page uses so
// the product reads as one place. Purely presentational; no data logic.

import Link from 'next/link'
import type { ReactNode } from 'react'
import { clsx } from 'clsx'

/** Page header: eyebrow + fantasy title + optional subtitle & actions. */
export function PageHeader({
  eyebrow, title, subtitle, actions,
}: { eyebrow?: string; title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title mt-1">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm" style={{ color: 'var(--text-mid)' }}>{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

/** Layered fantasy panel. `ornate` adds the gold-topped variant. */
export function Panel({
  ornate, hover, className, children, ...rest
}: { ornate?: boolean; hover?: boolean; className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx(ornate ? 'panel-ornate' : 'panel', hover && 'card-hover', className)} {...rest}>
      {children}
    </div>
  )
}

/** Empty state — honest, on-brand "nothing here yet" with an optional action. */
export function EmptyState({
  icon, title, body, action,
}: { icon?: ReactNode; title: string; body?: string; action?: { href: string; label: string } }) {
  return (
    <div className="panel flex flex-col items-center gap-3 px-6 py-14 text-center">
      {icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border text-2xl"
              style={{ borderColor: 'var(--edge)', background: 'var(--surface-3)', color: 'var(--gold)' }}>
          {icon}
        </span>
      )}
      <h3 className="font-display text-lg font-bold" style={{ color: 'var(--text-hi)' }}>{title}</h3>
      {body && <p className="max-w-sm text-sm" style={{ color: 'var(--text-mid)' }}>{body}</p>}
      {action && <Link href={action.href} className="btn btn-primary mt-1">{action.label}</Link>}
    </div>
  )
}

/** Loading skeleton grid of cards. */
export function SkeletonGrid({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={clsx('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="panel p-4">
          <div className="skeleton mb-3 h-28 w-full" />
          <div className="skeleton mb-2 h-4 w-2/3" />
          <div className="skeleton h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

/** Small status pill. */
export function StatusPill({ tone = 'gold', children }: { tone?: 'gold' | 'ember' | 'arcane' | 'crimson' | 'ok'; children: ReactNode }) {
  const cls = tone === 'ok' ? 'badge-gold' : `badge-${tone}`
  return <span className={clsx('badge', cls)}>{children}</span>
}

/** A back/breadcrumb link with a gold chevron. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: 'var(--text-mid)' }}>
      <span style={{ color: 'var(--gold)' }}>‹</span>
      <span className="hover:text-[var(--text-hi)]">{children}</span>
    </Link>
  )
}
