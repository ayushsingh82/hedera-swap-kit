import Image from "next/image";
import Link from "next/link";
import type { NextPage } from "next";
import {
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  CreditCardIcon,
  CubeTransparentIcon,
  LinkIcon,
  PuzzlePieceIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { CodeBlock } from "~~/components/CodeBlock";

const useCases = [
  {
    icon: ArrowsRightLeftIcon,
    title: "Swap",
    text: "HBAR to token, token to token, token to HBAR, with live quotes and price impact.",
    href: "/swap",
  },
  {
    icon: CreditCardIcon,
    title: "Pay in any token",
    text: "Share a payment link. The buyer pays with any token and you receive the one you chose.",
    href: "/pay",
  },
  {
    icon: UsersIcon,
    title: "Payouts",
    text: "Pay many people in one transaction, each in the token they want. Failed rows are refunded.",
    href: "/payouts",
  },
  {
    icon: ArrowPathIcon,
    title: "Auto-buy",
    text: "Buy a token on a schedule. The Hedera Schedule Service runs every purchase, with no bot.",
    href: "/dca",
  },
  {
    icon: BanknotesIcon,
    title: "Buy a token",
    text: "An embeddable on-ramp for your own token, with the output fixed.",
    href: "/buy",
  },
];

const features = [
  {
    icon: LinkIcon,
    title: "Hedera-native swaps",
    text: "HBAR in, token to token and token to HBAR. WHBAR is handled through the router, never called directly.",
  },
  {
    icon: CubeTransparentIcon,
    title: "Association, solved",
    text: "Checks whether an account can hold a token and associates in one click. Accounts with automatic associations need no step.",
  },
  {
    icon: PuzzlePieceIcon,
    title: "A kit of parts",
    text: "SwapWidget, TokenSelect, QuoteDetails, AssociateButton and hooks. Drop one in or the whole widget.",
  },
  {
    icon: BanknotesIcon,
    title: "Built-in app fee",
    text: "An optional integrator fee, capped at 1%, so the app you build on this can earn from swaps.",
  },
];

const snippet = `import { SwapWidget } from "~~/components/swap";

export default function Page() {
  return <SwapWidget />;
}`;

const Home: NextPage = () => (
  <div className="flex grow flex-col items-center">
    <div className="hedera-gradient dark:bg-none dark:bg-hedera-charcoal w-full px-5 py-16">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <Image
          src="/Hedera-Icon-White.svg"
          alt="Hedera icon"
          width={64}
          height={64}
          className="mb-6 hidden dark:block"
        />
        <Image src="/Hedera-Icon-Dark.svg" alt="Hedera icon" width={64} height={64} className="mb-6 dark:hidden" />
        <h1 className="text-4xl font-bold">hedera-swap-kit</h1>
        <p className="mt-3 text-lg opacity-80">
          Swap, pay, pay out and schedule on Hedera. A Scaffold-HBAR template built on SaucerSwap V2 and the Hedera
          Schedule Service.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/swap" className="btn btn-primary">
            <ArrowsRightLeftIcon className="h-5 w-5" />
            Try the swap
          </Link>
          <Link href="/docs" className="btn btn-outline">
            Read the docs
          </Link>
        </div>
      </div>
    </div>

    <div className="mx-auto w-full max-w-5xl px-5 py-12">
      <h2 className="mb-4 text-xl font-bold">Use cases</h2>
      <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {useCases.map(({ icon: Icon, title, text, href }) => (
          <Link
            key={title}
            href={href}
            className="rounded-2xl border border-base-300 bg-base-100 p-5 transition-colors hover:border-primary"
          >
            <Icon className="mb-2 h-6 w-6 text-primary" />
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 text-sm opacity-70">{text}</p>
          </Link>
        ))}
      </div>

      <h2 className="mb-4 text-xl font-bold">What is inside</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-base-300 bg-base-100 p-5">
            <Icon className="mb-2 h-6 w-6 text-primary" />
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-sm opacity-70">{text}</p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="mb-2 text-xl font-bold">Use it in your app</h2>
        <CodeBlock code={snippet} filename="app/page.tsx" />
      </div>
    </div>
  </div>
);

export default Home;
