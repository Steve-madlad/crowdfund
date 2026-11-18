import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

describe("CrowdFunding", async function () {
  const { viem, networkHelpers } = await network.create();
  const [creator, backer] = await viem.getWalletClients();
  const owner = creator.account.address;

  const futureDeadline = () => BigInt(Math.floor(Date.now() / 1000) + 3600);

  it("stores multiple HTTPS image URLs and keeps the first-image getter", async function () {
    const crowdfunding = await viem.deployContract("CrowdFunding");
    const images = [
      "https://example.com/campaign-main.png",
      "https://example.com/campaign-detail.png",
    ];

    await crowdfunding.write.createCampaign([
      owner,
      "Community garden",
      "Help build a neighborhood garden.",
      1_000_000_000_000_000_000n,
      futureDeadline(),
      images,
    ]);

    assert.deepEqual(await crowdfunding.read.getCampaignImages([0n]), images);
    assert.equal((await crowdfunding.read.campaigns([0n]))[6], images[0]);
    assert.deepEqual(
      (await crowdfunding.read.getCampaigns())[0].additionalImages,
      images.slice(1),
    );
  });

  it("rejects empty, excessive, non-HTTPS, oversized, and duplicate image URLs", async function () {
    const crowdfunding = await viem.deployContract("CrowdFunding");
    const create = (images: string[]) =>
      crowdfunding.write.createCampaign([
        owner,
        "A cause",
        "A short story.",
        1n,
        futureDeadline(),
        images,
      ]);

    await viem.assertions.revertWith(create([]), "Campaign image count is out of range");
    await viem.assertions.revertWith(
      create(Array.from({ length: 6 }, (_, index) => `https://example.com/${index}.png`)),
      "Campaign image count is out of range",
    );
    await viem.assertions.revertWith(
      create(["http://example.com/image.png"]),
      "Campaign image URL must use HTTPS",
    );
    await viem.assertions.revertWith(
      create([`https://example.com/${"a".repeat(505)}`]),
      "Campaign image URL length is out of range",
    );
    await viem.assertions.revertWith(
      create(["https://example.com/image.png", "https://example.com/image.png"]),
      "Campaign image URLs must be unique",
    );
  });

  it("rejects donations to invalid, ended, and goal-reached campaigns", async function () {
    const crowdfunding = await viem.deployContract("CrowdFunding");
    await viem.assertions.revertWith(
      crowdfunding.write.donateToCampaign([0n], { account: backer.account, value: 1n }),
      "Campaign does not exist",
    );

    const publicClient = await viem.getPublicClient();
    const latestBlock = await publicClient.getBlock();
    await crowdfunding.write.createCampaign([
      owner,
      "A cause",
      "A short story.",
      2n,
      latestBlock.timestamp + 10n,
      ["https://example.com/image.png"],
    ]);
    await networkHelpers.time.increase(11);
    await viem.assertions.revertWith(
      crowdfunding.write.donateToCampaign([0n], { account: backer.account, value: 1n }),
      "Campaign has ended",
    );

    await crowdfunding.write.createCampaign([
      owner,
      "Another cause",
      "A second short story.",
      1n,
      futureDeadline(),
      ["https://example.com/another-image.png"],
    ]);
    await crowdfunding.write.donateToCampaign([1n], { account: backer.account, value: 1n });
    await viem.assertions.revertWith(
      crowdfunding.write.donateToCampaign([1n], { account: backer.account, value: 1n }),
      "Campaign goal has been reached",
    );
  });
});
