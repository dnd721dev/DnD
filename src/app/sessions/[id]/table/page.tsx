import { use } from 'react'
import dynamic from 'next/dynamic'

// Keep TableClient client-only (wallet/livekit/map stuff)
const TableClient = dynamic(() => import('./TableClient'), { ssr: false })

export default function TablePage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params)
  return <TableClient sessionId={id} />
}
