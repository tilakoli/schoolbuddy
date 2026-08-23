export default function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      <span className="mt-6 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
        Coming soon
      </span>
    </main>
  );
}
