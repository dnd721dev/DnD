import TableClient from './TableClient'

interface PageProps {
  params: { id: string }
}

export default function SessionTablePage({ params }: PageProps) {
  return <TableClient sessionId={params.id} />
}
