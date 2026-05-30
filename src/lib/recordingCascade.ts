// src/lib/recordingCascade.ts
// Recovery Wave 3 — shared helper that marks every still-recording child
// track as `file_status='failed'` when its parent recording can no longer
// produce a usable file. Called from:
//   - /api/recording/[sessionId]/recover/route.ts when LiveKit reports the
//     composite egress as FAILED or ABORTED
//   - /api/livekit-webhook/route.ts when room_finished arrives and the
//     recording is being marked 'stopped' without ever reaching 'completed'
//
// Centralised so the rule "parent terminal → tracks not-yet-ready terminal"
// stays in one place.

import type { supabaseAdmin } from '@/lib/supabaseAdmin'

type DB = ReturnType<typeof supabaseAdmin>

export async function cascadeFailedTracks(
  db: DB,
  recordingId: string,
  reason: string,
): Promise<void> {
  const { error } = await db
    .from('recording_tracks')
    .update({
      file_status: 'failed',
      error: reason.slice(0, 480),
    })
    .eq('recording_id', recordingId)
    .eq('file_status', 'recording')
  if (error) {
    console.error('[recordingCascade] failed to cascade tracks for', recordingId, error)
  }
}
