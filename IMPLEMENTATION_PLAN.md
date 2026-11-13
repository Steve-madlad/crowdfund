# Crowdfund DApp: Implementation Plan

## Purpose and approval boundary

This document records the approved scope and a staged approach to stabilize and improve the Crowdfund DApp. The phases and recommendations have been approved. The recommended IPFS decision is to defer IPFS for the first release and use verified external image URLs. Work is being delivered one phase at a time.

## Approval status

- **Approved:** All implementation phases and proposed UI/tooling dependencies.
- **Approved:** Keep category filtering and pagination client-side for the first pass; implement campaign categories and use them for filtering.
- **Approved:** Support multiple externally hosted image URLs; defer IPFS for the first release.
- **Approved:** Scope escrow/withdrawals as a separate fund-management design that considers refunds.
- **Approved:** Navbar search should instantly filter campaigns on the home page.
- **Added to approved UI scope:** Define reusable colors as CSS variables exposed through Tailwind utilities; replace the custom modal with a shadcn/ui Dialog, including a polished wallet/connector-selection experience.
- **IPFS recommendation:** Do not require IPFS, a paid plan, a credit card, or an upload backend for the first release. Use verified external HTTPS image URLs and store URL references on-chain if multi-image support is implemented.

## Current project snapshot

- **Frontend:** React 19, TypeScript 6, Vite 8, React Router 7, Tailwind CSS 4.
- **Ethereum client:** Wagmi 3, Viem 2, TanStack Query 5. Wagmi's generated ABI/hooks are in `frontend/src/generated.ts`.
- **Contracts:** Solidity 0.8.38 on Hardhat 3, using `@nomicfoundation/hardhat-toolbox-viem`; deployment configuration includes local Hardhat and Sepolia.
- **Existing screens:** Home, campaign details, campaign creation, and a placeholder profile page. The desktop sidebar and mobile menu are custom components; styling is predominantly custom Tailwind classes.
- **Existing avatar treatment:** DiceBear-generated bot avatars are already used for connected accounts and campaign owners.
- **Tests:** Hardhat's sample Node test currently covers the Counter contract, not Crowdfunding. The frontend package has build/lint scripts but no focused app test suite.

### Phase 0 baseline (2026-11-13)

- Installed versions: Wagmi 3.7.11, Viem 2.57.17 (frontend) / 2.57.16 (contract workspace), Hardhat 3.21.2, React 19.3.1, Tailwind 4.3.4, TypeScript 6.0.3.
- `npx hardhat test` passes: 5 existing Counter tests (3 Solidity and 2 Node tests). There are no Crowdfunding-specific tests yet.
- Frontend build currently fails with TypeScript unused-variable errors in `Navbar.tsx`, `CampiagnDetails.tsx`, `CreateCampaign.tsx`, and `Profile.tsx`.
- Frontend lint currently reports 15 errors and 2 warnings across those same screens, including unused values, one campaign-donor effect dependency warning, and a state update in an effect. These are baseline findings, not regressions from feature work.
- `npm ls` reports an extraneous frontend `semver` package and an invalid `forge-std` workspace dependency specification; the existing Hardhat tests still pass. Do not change dependencies solely to silence this before it is relevant.
- Local deployment entrypoint is `web3/scripts/deploy.ts`; it uses the configured `localhost` network at `127.0.0.1:8545`, deploys CrowdFunding and then Counter, and prints both addresses. There is no npm deployment script. The frontend reads the address from `VITE_REACT_CONTRACT_ADDRESS`; environment files are ignored, and no tracked `.env.example` is present. Secret values were not read or changed.
- The frontend ABI is generated from Hardhat artifacts via `frontend/wagmi.config.ts`; after any contract change, compile and regenerate `frontend/src/generated.ts`, then deploy and update the local environment address.
- **Phase 0 status:** Baseline and deployment configuration inspection complete. Local deployment is deferred until a contract change needs testing; no contract or app code was changed in this phase.

### Phase 1 implementation status (2026-11-13)

- Added shared BigInt-safe ETH formatting, seconds-based days-left handling with explicit expired state, bounded goal progress, and local-calendar end-of-day conversion for date inputs.
- Updated campaign cards and details to display raised/goal/donation values in ETH; details now load by numeric ID directly from the contract and query donor data for that campaign.
- Corrected campaign creation to submit the title field, removed the unused creator-name input (the contract has no creator-name field), and added goal/date validation plus wallet/write/receipt feedback.
- Added focused built-in Node tests for ETH formatting, deadline boundaries/date parsing, and progress calculations. `bun run test:unit` passes (5 tests); targeted ESLint on Phase 1 files passes.
- At the end of Phase 1, the full frontend build was blocked by baseline unused imports in `Navbar.tsx` and `Profile.tsx`; Phase 2 removed the unused Navbar values, leaving only the untouched `Profile.tsx` import.
- No Solidity change was needed in this phase; the existing Hardhat suite remains the Phase 0 baseline (5 passing).
- **Phase 1 status:** Complete.

## Baseline issues and constraints identified at intake

### Correctness and UX defects observed before Phase 1

1. **ETH amounts were inconsistently displayed.** The raised amount was shown as its raw on-chain integer while the goal was converted. Phase 1 adds a shared wei-to-ETH formatter for cards, details, and donor contributions; transaction inputs remain ETH-to-wei.
2. **Deadlines are Unix seconds from Solidity.** The old helper treated them as JavaScript milliseconds and could show misleading near-expiry values. Phase 1 uses seconds, rounds future partial days up, and returns an explicit ended state.
3. **Campaign routing relied on navigation state and used the title in the URL.** Phase 1 now routes by numeric campaign ID and reads the campaign directly from the contract, so direct links/reloads do not depend on navigation state.
4. **Campaign details had incomplete donor reads and funding values.** Phase 1 passes the campaign ID, formats amounts, and connects the progress bar; full visual redesign remains in Phase 4.
5. **Campaign creation had field wiring risks.** Phase 1 submits the title field and removes the unused creator-name input, which the contract did not store. Image preview/verification remains in Phase 4; transaction states are now surfaced.
6. **Home and navbar controls are partly decorative.** Search has no state or filtering behavior; home has no loading, error, or true empty state; pagination and filters are absent.
7. **Profile is a placeholder, and there is no wallet-disconnect flow.** The current navbar has an avatar link, and the sidebar's theme icon does not change the theme.
8. **The current Solidity read returns every campaign and all donor arrays at once.** Client-only pagination improves usability but does not bound RPC response size as the campaign count grows.
9. **Donations are transferred directly to the campaign owner in the donation transaction.** This is an important existing product/contract behavior to retain or explicitly reconsider; it is not an escrow/withdrawal model.

## Recommended implementation phases

Each phase should preserve existing user-facing behavior unless the change is explicitly called out and approved. We should run the relevant build, lint, and tests at each phase, and use the smallest practical test scope before expanding it.

### Phase 0 — API and deployment baseline

- Confirm the exact installed dependency versions, connector support, chain IDs, contract address configuration, generated ABI source, and available deployment scripts.
- Review current official Wagmi and Hardhat docs before touching wallet, transaction, or test code. Keep the frontend and contract toolchains on their existing major versions unless a specific incompatibility is found.
- Capture a baseline frontend build/lint and Hardhat test result, then identify the correct campaign contract test/deployment workflow.
- Treat the frontend contract address/ABI and deployed contract as a matched deployment artifact; regenerate ABI and redeploy/update configuration together if the contract changes.
- **Storage decision:** The first release will not depend on IPFS or a storage-provider account. Keep image bytes externally hosted and validate their URLs; if supporting multiple images, store only the URL strings on-chain, with explicit URL-count/length limits and gas-cost review. Never describe URL storage as storing the image itself on-chain.

### Phase 1 — Data correctness and resilient contract reads

- Introduce shared typed formatting helpers for wei/ETH, campaign progress, and Unix-second deadlines. Preserve exact BigInt arithmetic for values until formatting; do not convert wei to floating point for calculations.
- Specify deadline display rules: future dates use a positive rounded-up day count; expired dates show an explicit ended state; boundary values and invalid input are covered by tests. Date input represents the user's local calendar day and expires at that day's end.
- Use contract data as the source of truth for details, independently of router navigation state. Use stable IDs in routes and handle invalid IDs, missing campaigns, loading, read errors, and retries.
- Correct donor reads to pass the campaign ID and render each address with its actual donation amount. Format all contract ETH values consistently.
- Fix campaign creation field-to-argument mapping, date conversion, input validation, and error reporting. Keep wallet cancellation, rejected transactions, pending signatures, mined/reverted receipts, and successful completion as distinct states.
- Add focused tests for ETH values, deadline boundaries, route-data-independent loading, field mapping, and transaction/read state transitions where the existing test setup permits.

### Phase 2 — Shared UI states and accessibility foundation

- Define reusable page-level loading skeletons, inline loading indicators, error/retry panels, and empty states instead of silent blank sections.
- Provide clear status feedback for wallet connection, contract reads, submissions, transaction confirmations, image loading, and empty search/filter results.
- Define the repeated palette as semantic CSS custom properties (for example background/foreground, card, primary, muted, border, ring, success, warning, and destructive) and expose them through Tailwind 4 `@theme` tokens. Provide dark and light values so components use semantic classes such as `bg-background` and `text-foreground`, not duplicated hex values.
- Improve keyboard focus, button/input labels, contrast, semantic landmarks, and reduced-motion behavior while establishing shared spacing, typography, color, and responsive layout tokens.
- Replace the existing custom modal implementation with a project-styled shadcn/ui Dialog component. Use it for wallet selection and any other modal flows, with correct focus trapping/restoration, Escape/outside-close behavior, keyboard operation, and mobile sizing.
- Keep error messages actionable and avoid presenting failed reads or transactions as successful empty data.

### Phase 2 implementation status (2026-11-13)

- Added semantic dark/light CSS variables and Tailwind 4 color tokens; replaced repeated palette literals in the app shell, navigation, shared inputs/buttons, home, campaign details, and creation form.
- Added reusable campaign-grid and campaign-detail skeletons plus shared error/retry and empty-state panels. Home now distinguishes loading, read failure, and no campaigns; details and supporter reads also show retryable errors or loading/empty states.
- Replaced the hand-built modal with an accessible Radix-based Dialog wrapper styled with the shared tokens; wallet selection now has a title/description, responsive connector choices, loading/error feedback, and standard Escape/outside-close and focus handling.
- Improved keyboard focus, form controls, mobile navigation semantics, status announcements, and reduced-motion behavior for skeletons. The home campaign list and its skeleton now use the same responsive grid: 1 column on phones, 2 at `sm`, 3 at `lg`, and 4 at `2xl`.
- Added `@radix-ui/react-dialog` and `lucide-react`; used Bun and updated `frontend/bun.lock`.
- Verification: `bun run lint` passes; `bun run test:unit` passes (5 tests); `bunx vite build` succeeds. Browser checks at 320, 390, 768, 1024, 1440, and 1600 px showed 1/1/2/3/3/4 columns respectively and no horizontal overflow. The dialog was exercised through form submission and Escape close; the light-theme CSS variables were verified in-browser. The empty campaign state was tested at mobile width by temporarily simulating zero campaigns, then restoring the contract-backed data.
- `bun run build` remains blocked only by the pre-existing unused React import in untouched `frontend/src/pages/Profile.tsx`. The standalone Vite build reports a dependency externalization notice for `node:worker_threads` and a chunk-size advisory.
- No Solidity changes or local deployment were needed.
- **Phase 2 status:** Complete. Stop here before Phase 3 to keep implementation sequential.

### Phase 3 — Home discovery and campaign cards

- Implement navbar search as a controlled, accessible search that instantly filters the home campaign list by title and description; combine it with category selection and show a useful no-results state.
- Improve cards with a consistent image aspect ratio/fallback, creator DiceBear identity, ETH-raised/goal values, progress, deadline/ended status, and clear hover/focus/tap affordances.
- Add client-side filters and sorting for active/ended/goal reached, title/description search, category, newest/oldest, and funding progress. First-pass filtering and pagination remain client-side; no pagination contract change is included in this phase.
- Category filtering is client-side as approved, but the current contract has no category field. Before implementing category labels, decide whether to derive categories deterministically from existing title/description data (no contract change, but less precise) or add a category field to the contract (durable, but requires a redeployment). Do not use local-only category assignments that differ between users.
- Add responsive pagination and empty states. Client-side pagination does not bound the current `getCampaigns()` RPC response; revisit bounded reads/indexing if campaign volume grows.
- Use an ID-based details link rather than click handlers on non-semantic containers.

### Phase 4 — Campaign detail and creation redesign

- Redesign details into a responsive campaign/story and donation layout with a prominent hero image, creator identity, funding progress, amount raised/goal, deadline state, donor list, and share/explorer affordances.
- Connect the progress bar to correctly formatted contract values and cap its visual width at 100% while showing the true amount if overfunded.
- Trigger a restrained, accessible confetti celebration only when the goal is reached; avoid repeatedly firing it on rerender or when merely loading an already-funded campaign.
- Rebuild the campaign form as a clear responsive multi-section flow with useful help text, validation, disabled/pending states, field-level errors, preview, and transaction confirmation.
- Use the existing `checkIfImage` utility (or replace it with an async, race-safe validator) to verify image URLs. Show a responsive preview with a fallback and allow the user to correct failed URLs before submitting.
- Support multiple verified HTTPS image URLs, with preview, ordering, removal, validation, and fallback for each image. If image URLs are persisted as a Solidity string array, account for increased transaction/storage costs and require a new deployment; do not store image file bytes on-chain.

### Phase 5 — Wallet profile, disconnect, theme, and feedback

- Add a professional wallet/connector-selection dialog using the new shadcn/ui Dialog component, with connector names/icons, connection pending/error feedback, and appropriate handling for unavailable connectors or wallets that need installation.
- Add a profile/avatar dropdown that presents a deterministic DiceBear avatar, shortened and copyable address, connected network, profile navigation, and explicit disconnect action.
- Use Wagmi's current connection state and `useDisconnect` mutation; show pending/error/success states and close the menu appropriately. Do not equate disconnecting in the app with revoking a wallet's site permissions.
- Build the profile screen with campaign-created, donated, total-contributed, and supporter statistics, plus campaign lists. Add charts only for data that can be derived correctly and efficiently from contract state/events.
- Add persisted dark/light theme selection using the shared CSS variables. Apply it consistently to all pages, including mobile navigation, forms, skeletons, empty states, charts, and dialogs. Respect system preference on first visit and avoid theme flashes where feasible.
- Add toast notifications for concise transient outcomes, while keeping important errors and transaction states visible in the page for assistive technology and users who miss a toast.

### Phase 6 — Escrow/refund design, contract/indexing, and production hardening

- Separately design the escrow/withdrawal and refund rules before writing contract code: when funds are held or withdrawable, who may withdraw, whether goal/deadline conditions apply, how partial/full refunds work, how donor balances are accounted for, and what happens on cancellation or failed goals.
- Make this a documented economic/security decision with explicit user-facing terms and dedicated tests. The approved scope is to design this behavior; implementation and deployment should follow only after those rules are reviewed.
- Keep contract transfers pull-based where appropriate, define state/accounting invariants, and assess reentrancy, failure handling, and gas/storage growth as part of contract design and review.

- Add Crowdfunding-specific tests for creation, deadline validation, donation accounting, transfers, donor history, invalid IDs, and any newly approved contract behavior.
- Review pagination and event requirements against the expected campaign volume and target RPC provider. The current unbounded `getCampaigns()` call and embedded donor arrays are not a scalable index.
- If approved, add indexed events and bounded read methods for campaign creation/donations; use logs as profile history where reliable, or an indexer if the product needs robust large-scale filtering and analytics.
- Verify deploy scripts/configuration, generated ABI refresh, chain/address mismatch messaging, and testnet smoke flow. Preserve any deployed contract's behavior; Solidity changes require a new deployment and explicit frontend migration to its address.
- Run responsive checks at phone/tablet/desktop widths, keyboard-only checks, frontend build/lint, and the complete relevant Hardhat test suite before calling the work complete.

## Library and tooling recommendations

These are approved recommendations. Install only the dependencies needed by the active phase; Phase 2 added `@radix-ui/react-dialog` and `lucide-react`.

| Need | Recommendation | Reason / boundary |
|---|---|---|
| UI primitives | **shadcn/ui** components selected as needed, using its Radix-based accessible primitives and Tailwind styling | Fits the existing Tailwind 4 approach without replacing the whole app with a heavyweight design system. Verify the generated Tailwind 4 setup before adding components. |
| Modal/dialog | **shadcn/ui-style Dialog** backed by Radix, replacing the custom `Modal` component | The shared dialog wrapper is implemented with Radix accessibility behavior and project theme tokens; the full connector-picker polish remains in Phase 5. |
| Theme colors | **CSS custom properties + Tailwind 4 `@theme inline` tokens** | Implemented in Phase 2 to support semantic colors and dark/light values without repeated palette literals. |
| Toasts | **Sonner** | Small, straightforward toast API; use alongside persistent inline form/transaction errors, not instead of them. |
| Form validation | **React Hook Form + Zod** | Clear field-level validation and typed form data for the larger creation flow; adopt only if it reduces complexity over the current form. |
| Charts | **Recharts** | Suitable for responsive profile summaries; use only for metrics we can calculate from reliable data. |
| Goal celebration | **canvas-confetti** | Small, event-triggered effect; honor reduced-motion preferences and avoid repeated firing. |
| Avatars | **DiceBear** | Keep the current deterministic address-derived identity; optionally switch to DiceBear packages for local SVG generation and fewer runtime third-party image requests. |
| Tests | Existing **Hardhat 3 + node:test + Viem** for contracts; add a lightweight frontend unit/component test setup only if current infrastructure supports focused UI/helper tests cleanly | Do not introduce an expansive test framework before confirming the existing scripts and desired test coverage. |

Dependency versions should be checked against the installed React 19, Tailwind 4, TypeScript 6, Wagmi 3 and Vite 8 versions at implementation time. Add only libraries needed for an approved phase.

## Contract changes worth considering

The current campaign struct supports one image URL and has no category or profile metadata. The campaign array getter returns all campaigns, and campaign structs include all donor addresses/amounts. These are valid for a prototype but constrain discovery/profile growth.

### Recommended minimal contract extension, if separately approved

1. Emit `CampaignCreated` and `DonationReceived` events with indexed campaign ID and relevant owner/donor addresses. These events support history and analytics without requiring profile enumeration from a single giant view response.
2. Add bounded campaign reads such as a start/limit getter, retaining existing getters if compatibility is useful. Treat zero limit, out-of-range start, and maximum batch size explicitly.
3. Category filtering and pagination are approved as client-side first-pass features; do not add Solidity fields or pagination methods for them in that phase. Category metadata still needs a durable source.
4. Multi-image support is approved. With the no-IPFS recommendation, store only validated image URL strings on-chain if multiple images are implemented. Bound URL count and length, surface gas estimates, and deploy a new contract; do not put image bytes into Solidity storage.
5. Escrow, withdrawals, and refunds require a separate reviewed contract design and a new deployment; they are not a small extension to the current immediate-transfer model.

### Bigger product/economic decisions — defer unless explicitly requested

- **Escrow and withdrawals:** Current donations are paid immediately to the owner. The separate escrow/withdrawal/refund design is approved for scoping, but changing custody and user expectations requires explicit rules, careful contract design, tests, and a new deployment.
- **Refunds/campaign cancellation:** Requires clear eligibility, deadline, goal, and accounting rules, not just a UI control.
- **On-chain identity/profile metadata:** Storing descriptions or profile data on-chain adds permanent cost; consider off-chain/IPFS metadata with content-addressed references instead.
- **Image uploads/IPFS:** Multi-image URL support is approved; IPFS uploads are deferred. Verify URLs at creation time, while making clear that verification does not guarantee future availability.
- **User-generated categories and rich analytics:** Require an indexing strategy if filters and charts must remain fast across many campaigns.

Any Solidity change means a new contract deployment; the app cannot update an already deployed contract in place. We should not make these changes without agreeing on migration and testnet verification first.

## Final IPFS recommendation: defer it for the first release

The requirement is no payment and no credit card. Pinata currently advertises a $0 tier with 1 GB storage, 10 GB bandwidth, and one gateway on its [pricing page](https://pinata.cloud/pricing), but that page does not establish whether signup/API-key creation requires a card or guarantee those limits will be sufficient. Its current [React guidance](https://docs.pinata.cloud/frameworks/react.md) recommends presigned uploads with a server-side endpoint; the API secret cannot be embedded in this Vite frontend, and a public signing endpoint needs hosting and abuse controls. That is additional operational surface for a workflow you want to keep free and low-maintenance.

Therefore, **do not make IPFS a dependency now**. Continue with externally hosted, verified HTTPS image URLs. If multiple images are implemented, store the URL references (not image bytes) on-chain, limit their number and length, show users the additional gas cost, and deploy a new contract. This avoids provider accounts, API secrets, credit-card uncertainty, and an upload backend.

Important trade-offs:

- On-chain URL strings are durable pointers, not the image files. The external host can remove, replace, or block an image after it passes validation; URL verification only confirms availability/type at creation time.
- Storing multiple long URLs on-chain increases transaction and permanent storage costs. If those costs are unacceptable, retain a single on-chain URL or revisit a genuinely no-card storage option later.
- Pinata's public free tier may still be worth reconsidering if you independently confirm signup and use require no card and its limits are adequate. Public IPFS gateways can be rate-limited and are not recommended by provider docs as a production delivery dependency.
- A campaign category cannot be durably user-selected and shared across visitors without storing it somewhere. Since first-pass category filtering is client-side and IPFS is deferred, decide between deterministic category inference from title/description or a new on-chain category field before implementing category labels. The latter requires a contract change/redeployment.

This is the recommended storage decision recorded in the plan, not implementation approval for Solidity changes. No IPFS or contract change has been implemented.

## Current Wagmi and Hardhat API guidance

The installed frontend already depends on **Wagmi v3**, and the contract workspace uses **Hardhat 3**. The official current docs were checked on 2026-11-13:

- Wagmi's current [`useConnect` API](https://wagmi.sh/react/api/hooks/useConnect) uses the TanStack Query-style `mutate`/`mutateAsync` methods. Thus, the existing `const { mutate: connectWallet } = useConnect()` is consistent with v3; do not migrate it to an older `.connect()` hook property.
- The [Wagmi v2-to-v3 migration guide](https://wagmi.sh/react/guides/migrate-from-v2-to-v3) documents renamed account hooks (`useAccount` → `useConnection`), renamed mutation methods (`connect` → `mutate`), and removed `useConnect().connectors` / `useDisconnect().connectors` properties. The current code's `useConnection`, `useConnectors`, and `mutate` patterns are already aligned. Connector dependencies are now optional peer dependencies, so each configured connector's requirements must be verified before adding/changing connectors.
- The current [`useDisconnect` API](https://wagmi.sh/react/api/hooks/useDisconnect) exposes `mutate`/`mutateAsync`; the profile menu should use this documented API rather than older examples.
- Hardhat's current [Getting Started guide](https://hardhat.org/docs/getting-started) and [Hardhat 3 Viem toolbox guidance](https://hardhat.org/docs/plugins/hardhat-toolbox-viem) match this repo's Hardhat 3 + Viem plugin setup. The current test uses Hardhat 3's `network.create()` pattern; preserve it unless a verified plugin/API requirement necessitates a change.
- API documentation is versioned and can change. Re-check the docs and the project's installed package types before each wallet or contract integration change; do not copy old Wagmi v1/v2 or Hardhat 2 snippets into this codebase.

## Decisions for review

The phases, dependencies, client-side first pass for categories/pagination, multi-image scope, escrow/refund design scope, instant home filtering, and the no-IPFS URL-storage recommendation are recorded as approved scope. Before Phase 3 implements category labels, choose deterministic inference from title/description or an on-chain category field, and review the gas implications of storing multiple URL strings on-chain before Phase 4 changes the contract.

## Definition of done

- ETH values and deadlines are correct, consistent, and covered by focused tests.
- All requested flows have explicit loading, error, success, and empty states where applicable.
- Search, filtering, sorting, and pagination work with stable campaign IDs and understandable result counts.
- Campaign creation and detail pages are polished, responsive, accessible, and correctly reflect wallet/transaction state.
- Profile, disconnect, and theme controls work at mobile and desktop sizes and persist where appropriate.
- Repeated colors come from semantic CSS variables mapped into Tailwind; theme choices remain consistent in the shadcn/ui dialogs and connector picker.
- Confetti is tied to a real goal-reached transition; images have preview/fallback behavior; DiceBear identities remain deterministic.
- Existing campaign image URLs remain compatible; any added multi-image URL storage has explicit limits and gas costs. No IPFS credential or upload-signing backend is required in the first release.
- Frontend build/lint and relevant contract tests pass. Any contract changes have a documented deployment/address/ABI migration and are verified on a local chain before testnet use.
