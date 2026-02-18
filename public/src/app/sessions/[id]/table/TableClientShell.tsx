'use client'

import dynamic from 'next/dynamic'

const TableClient = dynamic(() => import('./TableClient'), { ssr: false })

export default function TableClientShell({ sessionId }: { sessionId: string }) {
  return <TableClient sessionId={sessionId} />
}
