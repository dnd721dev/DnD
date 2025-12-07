import SessionsClient from './SessionsClient'

interface PageProps {
  params: { id: string }
}

export default function CampaignSessionsPage({ params }: PageProps) {
  // Server component – just passes the campaign id down
  return <SessionsClient campaignId={params.id} />
}
