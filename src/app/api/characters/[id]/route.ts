// src/app/api/characters/[id]/route.ts
// Character-level REST operations.
//
// DELETE — permanently delete a character owned by the requesting wallet.
//   session_characters rows are cleaned up automatically via ON DELETE CASCADE.
//
// Auth: wallet_address must match the character's stored wallet (case-insensitive).

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: characterId } = await ctx.params

  let wallet = ''
  try {
    const body = await req.json()
    wallet = String(body.wallet ?? '').toLowerCase()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!wallet) {
    return NextResponse.json({ error: 'wallet required' }, { status: 400 })
  }

  const db = supabaseAdmin()

  const { data: char, error: fetchErr } = await db
    .from('characters')
    .select('id, wallet_address')
    .eq('id', characterId)
    .maybeSingle()

  if (fetchErr) {
    console.error('[DELETE character] fetch error', fetchErr)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  if (!char) {
    return NextResponse.json({ error: 'Character not found' }, { status: 404 })
  }

  if (String(char.wallet_address ?? '').toLowerCase() !== wallet) {
    return NextResponse.json({ error: 'Not your character' }, { status: 403 })
  }

  const { error: deleteErr } = await db
    .from('characters')
    .delete()
    .eq('id', characterId)

  if (deleteErr) {
    console.error('[DELETE character] delete error', deleteErr)
    return NextResponse.json({ error: 'Failed to delete character' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export const dynamic = 'force-dynamic'
