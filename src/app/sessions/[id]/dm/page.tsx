import { use } from 'react'
import { DmDashboard } from './DmDashboard'

export default function DmDashboardPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(props.params)
  return <DmDashboard sessionId={id} />
}
