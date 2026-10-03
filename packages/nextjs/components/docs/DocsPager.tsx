"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { docsPages } from "./nav";

/** Previous and next links in reading order. */
export const DocsPager = () => {
  const pathname = usePathname();
  const index = docsPages.findIndex(page => page.href === pathname);
  if (index === -1) return null;
  const prev = docsPages[index - 1];
  const next = docsPages[index + 1];

  return (
    <div className="mt-12 grid grid-cols-2 gap-3 border-t border-base-300 pt-6 text-sm">
      {prev ? (
        <Link href={prev.href} className="rounded-2xl border border-base-300 p-4 hover:border-primary">
          <span className="block text-xs opacity-60">Previous</span>
          <span className="font-semibold">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link href={next.href} className="rounded-2xl border border-base-300 p-4 text-right hover:border-primary">
          <span className="block text-xs opacity-60">Next</span>
          <span className="font-semibold">{next.title}</span>
        </Link>
      )}
    </div>
  );
};
