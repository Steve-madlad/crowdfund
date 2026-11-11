import { defineConfig } from "@wagmi/cli";
import { hardhat, react } from "@wagmi/cli/plugins";

export default defineConfig({
  out: "src/generated.ts",
  plugins: [
    hardhat({
      project: "../web3",
      include: ["CrowdFunding.json"],
      commands: { build: false },
    }),
    react(),
  ],
});