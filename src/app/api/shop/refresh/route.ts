// POST /api/shop/refresh
// Called by Vercel Cron daily at midnight UTC.
// Expires the current inventory and generates a fresh one.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { generateDailyInventory } from '@/lib/shopInventory'

export async function POST(req: NextRequest): Promise<Response> {
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const db = supabaseAdmin()

  // Expire all currently active inventory rows
  await db
    .from('shop_inventory')
    .update({ is_active: false })
    .eq('is_active', true)

  // Generate new inventory for today
  const inv = generateDailyInventory()
  const now = new Date()
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  ))

  const { data, error } = await db
    .from('shop_inventory')
    .insert({
      generated_at: now.toISOString(),
      expires_at:   midnight.toISOString(),
      list_a:       inv.a,
      list_b:       inv.b,
      list_c:       inv.c,
      list_d:       inv.d,
      list_e:       inv.e,
      is_active:    true,
    })
    .select()
    .single()

  if (error) {
    console.error('[shop/refresh] insert error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('[shop/refresh] new inventory generated:', data.id)
  return NextResponse.json({ ok: true, inventoryId: data.id })
}
