export default function Home() {
return (
<main className="space-y-6">
<h1 className="text-3xl font-bold">Welcome to DND721</h1>
<p className="opacity-80">Connect your wallet, auto-build a character from your NFT, and join a campaign.</p>
<div className="flex gap-3">
<a className="px-4 py-2 rounded bg-indigo-600" href="/characters/new">Create Character</a>
<a className="px-4 py-2 rounded bg-teal-600" href="/campaigns">Find a Game</a>
</div>
</main>
)
}