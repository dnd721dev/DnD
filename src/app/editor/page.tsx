export default function EditorPage(){
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
      <h2 className="text-2xl font-semibold">Editor Role</h2>
      <p className="text-neutral-300">
        This workspace is for your content editor. They can upload audio, edit metadata, and export a mastered track.
      </p>
      <div className="rounded-2xl border border-neutral-800 p-4 space-y-3">
        <div className="font-semibold">Upload Audio (placeholder)</div>
        <input type="file" className="input w-full" />
        <div className="grid sm:grid-cols-2 gap-3">
          <input className="input" placeholder="Title" />
          <input className="input" placeholder="Artist" />
          <input className="input sm:col-span-2" placeholder="Description" />
        </div>
        <div className="flex gap-2">
          <button className="btn">Normalize (demo)</button>
          <button className="btn">Trim Silence (demo)</button>
          <button className="btn">Export WAV (demo)</button>
        </div>
      </div>
      <div className="text-sm text-neutral-400">
        * Spotify upload requires OAuth and partner APIs. We’ll add a server route & editor auth when you’re ready.
      </div>
    </div>
  );
}
