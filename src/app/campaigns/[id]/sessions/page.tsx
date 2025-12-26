import SessionsClient from './SessionsClient'

export default async function CampaignSessionsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: campaignId } = await params
  return <SessionsClient campaignId={campaignId} />
}
