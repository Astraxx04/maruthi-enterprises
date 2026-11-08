import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-3xl font-bold text-ink sm:text-4xl">We could not find that page</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        The product or page you are looking for may have been moved or is no longer listed. The full catalogue is
        always available below.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/products" className="btn btn-primary">Explore Catalogue</Link>
        <Link href="/" className="btn btn-secondary">Back to home</Link>
      </div>
    </div>
  );
}
