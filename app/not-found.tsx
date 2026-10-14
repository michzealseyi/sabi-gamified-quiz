import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-md p-8 text-center">
      <h1 className="text-3xl font-extrabold">Page not found</h1>
      <p className="mt-2">That quiz or page does not exist.</p>
      <Link href="/dashboard" className="btn-primary mt-6">
        Go to dashboard
      </Link>
    </div>
  );
}
