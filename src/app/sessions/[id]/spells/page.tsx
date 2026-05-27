import { use } from 'react'
import { SpellDashboard } from './SpellDashboard'

export default function SpellDashboardPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(props.params)
  return <SpellDashboard sessionId={id} />
}
