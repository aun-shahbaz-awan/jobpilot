export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  return (
    <div className="mx-auto mt-16 max-w-sm">
      <h1 className="text-2xl font-bold">Sign in to JobPilot</h1>
      <form method="post" action="/api/login" className="panel mt-6 space-y-4 p-5">
        <input type="hidden" name="next" value={next ?? "/"} />
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="field" autoFocus />
        </div>
        {error && <p className="text-sm text-danger">That password didn&apos;t match APP_PASSWORD.</p>}
        <button className="btn btn-primary w-full">Sign in</button>
      </form>
    </div>
  );
}
