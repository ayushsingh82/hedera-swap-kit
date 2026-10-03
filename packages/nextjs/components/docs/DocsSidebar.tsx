"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { docsExternal, docsNav, docsPages } from "./nav";
import { ArrowTopRightOnSquareIcon, Bars3BottomLeftIcon } from "@heroicons/react/24/outline";

const linkClass = (active: boolean) =>
  `block rounded-full px-3 py-1.5 text-sm transition-colors ${
    active ? "bg-primary/10 font-semibold text-primary" : "hover:bg-primary/5"
  }`;

const NavList = ({ onNavigate }: { onNavigate?: () => void }) => {
  const pathname = usePathname();
  return (
    <nav aria-label="Docs" className="space-y-6">
      {docsNav.map(group => (
        <div key={group.title}>
          <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide opacity-60">{group.title}</p>
          <ul className="space-y-0.5">
            {group.links.map(({ title, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={linkClass(pathname === href)}
                  aria-current={pathname === href ? "page" : undefined}
                  onClick={onNavigate}
                >
                  {title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div>
        <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide opacity-60">Resources</p>
        <ul className="space-y-0.5">
          {docsExternal.map(({ title, href }) => (
            <li key={href}>
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className={`${linkClass(false)} flex items-center gap-1.5`}
              >
                {title}
                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 opacity-60" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

/** A fixed sidebar on large screens and a dropdown on small ones. */
export const DocsSidebar = () => {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const current = docsPages.find(page => page.href === pathname)?.title ?? "Docs";

  return (
    <>
      <details ref={menuRef} className="rounded-2xl border border-base-300 bg-base-200 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold">
          <Bars3BottomLeftIcon className="h-5 w-5" />
          {current}
        </summary>
        <div className="border-t border-base-300 p-3">
          <NavList onNavigate={() => menuRef.current?.removeAttribute("open")} />
        </div>
      </details>
      <aside className="hidden w-60 shrink-0 lg:sticky lg:top-6 lg:block lg:self-start">
        <NavList />
      </aside>
    </>
  );
};
