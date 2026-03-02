import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">2D to 3D</h1>
      <nav className="flex gap-4">
        <Link
          href="/dashboard"
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
        >
          Dashboard
        </Link>
        <Link
          href="/canvas"
          className="rounded-md border border-input bg-background px-4 py-2 hover:bg-accent"
        >
          Canvas
        </Link>
      </nav>
    </main>
  );
}
