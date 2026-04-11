import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6 text-center">
      <SearchX className="w-10 h-10 text-muted-foreground" />
      <div>
        <h2 className="text-xl font-semibold">Page not found</h2>
        <p className="text-sm text-muted-foreground mt-1">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
      <Link href="/" className="text-sm underline underline-offset-2 hover:text-foreground text-muted-foreground">
        Go home
      </Link>
    </div>
  );
}
