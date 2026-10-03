import { parseAbi } from "viem";

export const swapHelperAbi = parseAbi([
  "function feeBps() view returns (uint16)",
  "function swapExactHbarForTokens(bytes path, address recipient, uint256 amountOutMinimum, uint256 deadline) payable returns (uint256 amountOut)",
  "function swapExactTokensForTokens(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint256 deadline) returns (uint256 amountOut)",
  "function swapExactTokensForHbar(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint256 deadline) returns (uint256 amountOut)",
  "function associate(address token)",
  "event Swapped(address indexed user, address indexed recipient, address indexed tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 fee)",
]);

export const quoterV2Abi = [
  {
    type: "function",
    name: "quoteExactInput",
    stateMutability: "nonpayable",
    inputs: [
      { name: "path", type: "bytes" },
      { name: "amountIn", type: "uint256" },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96AfterList", type: "uint160[]" },
      { name: "initializedTicksCrossedList", type: "uint32[]" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

export const erc20Abi = parseAbi([
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

/** HIP-719: an account associates itself with an HTS token by calling `associate()` on the token's address. */
export const hrc719Abi = parseAbi(["function associate() returns (uint256 responseCode)"]);
