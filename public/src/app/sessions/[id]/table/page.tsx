import { use } from 'react'
import TableClientShell from './TableClientShell'

export default function TablePage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params)
  return <TableClientShell sessionId={id} />
}
