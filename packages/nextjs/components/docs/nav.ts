export const REPO = "https://github.com/ayushsingh82/hedera-swap-kit";
export const SWAP_TX =
  "https://hashscan.io/testnet/transaction/0x1bd1c3480d29849e60e9f8abc79733b5fc713d1649a9edb118752ba08fd7b4f2";

export const PAYOUT_TX =
  "https://hashscan.io/testnet/transaction/0x6b8e5a07fd5fe34705a76ad9cb086c8e4c331c503f921595d3d2c87dc502ff5c";

export type DocsLink = { title: string; href: string };
export type DocsGroup = { title: string; links: DocsLink[] };

export const docsNav: DocsGroup[] = [
  {
    title: "Getting started",
    links: [
      { title: "Quickstart", href: "/docs" },
      { title: "How swaps work on Hedera", href: "/docs/how-it-works" },
    ],
  },
  {
    title: "Use cases",
    links: [
      { title: "Pay in any token", href: "/docs/pay" },
      { title: "Payouts", href: "/docs/payouts" },
      { title: "Auto-buy", href: "/docs/auto-buy" },
      { title: "Buy a token", href: "/docs/buy" },
    ],
  },
  {
    title: "Reference",
    links: [
      { title: "Components", href: "/docs/components" },
      { title: "Hooks", href: "/docs/hooks" },
    ],
  },
  {
    title: "Guides",
    links: [
      { title: "Customize", href: "/docs/customize" },
      { title: "Architecture", href: "/docs/architecture" },
      { title: "Troubleshooting", href: "/docs/troubleshooting" },
    ],
  },
];

export const docsExternal: DocsLink[] = [
  { title: "GitHub repository", href: REPO },
  { title: "Full docs on GitHub", href: `${REPO}/tree/main/docs` },
  { title: "Proof swap on Hashscan", href: SWAP_TX },
  { title: "Proof payout on Hashscan", href: PAYOUT_TX },
  { title: "SaucerSwap docs", href: "https://docs.saucerswap.finance" },
];

/** Every docs page in reading order, for previous and next links. */
export const docsPages: DocsLink[] = docsNav.flatMap(group => group.links);
