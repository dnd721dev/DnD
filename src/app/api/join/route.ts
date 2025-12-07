import { NextResponse } from 'next/server'


export async function POST(req: Request) {
const body = await req.json()
const { password, hash } = body
const ok = btoa(password || '') === hash
return NextResponse.json({ ok })
}