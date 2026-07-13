import { SpectateClient } from './SpectateClient'

export const metadata = { title: 'Spectate — DND721' }

export default async function SpectatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SpectateClient sessionId={id} />
}
