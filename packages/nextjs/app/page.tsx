import Image from "next/image";
import Link from "next/link";
import type { NextPage } from "next";
import {
  ArrowsRightLeftIcon,
  BanknotesIcon,
  CubeTransparentIcon,
  LinkIcon,
  PuzzlePieceIcon,
} from "@heroicons/react/24/outline";

const features = [
  {
    icon: LinkIcon,
    title: "Hedera-native swaps",
    text: "HBAR in, token to token and token to HBAR. WHBAR is handled through the router, never called directly.",
  },
  {
    icon: CubeTransparentIcon,
    title: "Association, solved",
    text: "Checks whether your account and the contract can hold a token, and associates in one click.",
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
          A Scaffold-HBAR template for apps that need token swaps on Hedera, built on SaucerSwap V2.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/swap" className="btn btn-primary">
            <ArrowsRightLeftIcon className="h-5 w-5" />
            Try the swap
          </Link>
          <Link href="/pools" className="btn btn-outline">
            Browse pools
          </Link>
        </div>
      </div>
    </div>

    <div className="mx-auto w-full max-w-4xl px-5 py-12">
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
        <pre className="overflow-x-auto rounded-2xl bg-base-200 p-4 text-sm">
          <code>{snippet}</code>
        </pre>
      </div>
    </div>
  </div>
);

export default Home;
