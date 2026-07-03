import { use } from 'react'
import { MeleeDashboard } from './MeleeDashboard'

export default function MeleeDashboardPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(props.params)
  return <MeleeDashboard sessionId={id} />
}
