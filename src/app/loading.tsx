export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 py-6">
      <div className="skeleton h-8 w-64 rounded-md" />
      <div className="skeleton h-4 w-96 max-w-full rounded-md" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-40 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
