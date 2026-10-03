"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowsRightLeftIcon,
  BanknotesIcon,
  Bars3Icon,
  BookOpenIcon,
  BugAntIcon,
  ChevronDownIcon,
  CircleStackIcon,
  ClockIcon,
  CreditCardIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-hbar";
import { useOutsideClick } from "~~/hooks/scaffold-hbar";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

/** The use cases the kit ships. They sit in one dropdown so the navbar stays short. */
const useCaseLinks: HeaderMenuLink[] = [
  { label: "Swap", href: "/swap", icon: <ArrowsRightLeftIcon className="h-4 w-4" /> },
  { label: "Pay", href: "/pay", icon: <CreditCardIcon className="h-4 w-4" /> },
  { label: "Buy a token", href: "/buy", icon: <BanknotesIcon className="h-4 w-4" /> },
];

export const menuLinks: HeaderMenuLink[] = [
  {
    label: "Pools",
    href: "/pools",
    icon: <CircleStackIcon className="h-4 w-4" />,
  },
  {
    label: "History",
    href: "/history",
    icon: <ClockIcon className="h-4 w-4" />,
  },
  {
    label: "Docs",
    href: "/docs",
    icon: <BookOpenIcon className="h-4 w-4" />,
  },
  {
    label: "Debug Contracts",
    href: "/debug",
    icon: <BugAntIcon className="h-4 w-4" />,
  },
  {
    label: "Block Explorer",
    href: "/blockexplorer",
    icon: <MagnifyingGlassIcon className="h-4 w-4" />,
  },
];

const linkClass = (isActive: boolean) =>
  `${isActive ? "bg-primary/10 text-primary font-semibold" : "hover:bg-primary/5"} py-1.5 px-3 text-sm rounded-full gap-2 grid grid-flow-col transition-colors`;

/** "Use cases" with its links. Closes after you pick one. */
const UseCasesMenu = () => {
  const pathname = usePathname();
  const ref = useRef<HTMLDetailsElement>(null);
  const isActive = useCaseLinks.some(link => link.href === pathname);

  useEffect(() => {
    ref.current?.removeAttribute("open");
  }, [pathname]);
  useOutsideClick(ref, () => ref.current?.removeAttribute("open"));

  return (
    <li>
      <details ref={ref}>
        <summary className={`${linkClass(isActive)} !grid-flow-col items-center`}>
          <span>Use cases</span>
          <ChevronDownIcon className="h-3 w-3" />
        </summary>
        <ul className="z-30 w-48 rounded-box bg-base-100 p-2 shadow-lg">
          {useCaseLinks.map(({ label, href, icon }) => (
            <li key={href}>
              <Link href={href} className={linkClass(pathname === href)}>
                {icon}
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
};

export const HeaderMenuLinks = () => {
  const pathname = usePathname();

  return (
    <>
      <UseCasesMenu />
      {menuLinks.map(({ label, href, icon }) => {
        const isActive = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              passHref
              className={`${
                isActive ? "bg-primary/10 text-primary font-semibold" : "hover:bg-primary/5"
              } py-1.5 px-3 text-sm rounded-full gap-2 grid grid-flow-col transition-colors`}
            >
              {icon}
              <span>{label}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
};

/**
 * Site header
 */
export const Header = () => {
  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  return (
    <div className="sticky lg:static top-0 navbar bg-base-100 min-h-0 shrink-0 justify-between z-20 shadow-sm border-b border-base-300 px-0 sm:px-2">
      <div className="navbar-start w-auto lg:w-1/2">
        <details className="dropdown" ref={burgerMenuRef}>
          <summary className="ml-1 btn btn-ghost lg:hidden hover:bg-transparent">
            <Bars3Icon className="h-1/2" />
          </summary>
          <ul
            className="menu menu-compact dropdown-content mt-3 p-2 shadow-sm bg-base-100 rounded-box w-52"
            onClick={() => {
              burgerMenuRef?.current?.removeAttribute("open");
            }}
          >
            <HeaderMenuLinks />
          </ul>
        </details>
        <Link href="/" passHref className="hidden lg:flex items-center gap-3 ml-4 mr-6 shrink-0">
          <div className="flex relative w-9 h-9">
            <Image alt="Hedera icon" className="cursor-pointer dark:hidden" fill src="/Hedera-Icon-Dark.svg" />
            <Image alt="Hedera icon" className="cursor-pointer hidden dark:block" fill src="/Hedera-Icon-White.svg" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold leading-tight text-base">hedera-swap-kit</span>
            <span className="text-[10px] tracking-wider uppercase text-base-content/50 font-medium">
              Built on Hedera
            </span>
          </div>
        </Link>
        <ul className="hidden lg:flex lg:flex-nowrap menu menu-horizontal px-1 gap-2">
          <HeaderMenuLinks />
        </ul>
      </div>
      <div className="navbar-end grow mr-4">
        <RainbowKitCustomConnectButton />
      </div>
    </div>
  );
};
