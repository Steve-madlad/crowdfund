import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

describe("CrowdFunding", async function () {
  const { viem, networkHelpers } = await network.create();
  const [creator, backer, secondBacker] = await viem.getWalletClients();
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

  it("holds contributions in escrow and lets only the owner withdraw after reaching the goal", async function () {
    const crowdfunding = await viem.deployContract("CrowdFunding");
    const publicClient = await viem.getPublicClient();
    const deadline = (await publicClient.getBlock()).timestamp + 3600n;
    await viem.assertions.revertWith(
      crowdfunding.write.withdrawFunds([0n]),
      "Campaign does not exist",
    );
    await crowdfunding.write.createCampaign([
      owner,
      "A cause",
      "A short story.",
      10n,
      deadline,
      ["https://example.com/image.png"],
    ]);

    await crowdfunding.write.donateToCampaign([0n], {
      account: backer.account,
      value: 6n,
    });
    await crowdfunding.write.donateToCampaign([0n], {
      account: secondBacker.account,
      value: 7n,
    });

    assert.equal(await publicClient.getBalance({ address: crowdfunding.address }), 13n);
    assert.equal(await crowdfunding.read.contributions([0n, backer.account.address]), 6n);
    assert.equal(await crowdfunding.read.contributions([0n, secondBacker.account.address]), 7n);
    assert.equal((await crowdfunding.read.getDonators([0n]))[0].length, 2);
    await viem.assertions.revertWith(
      crowdfunding.write.claimRefund([0n], { account: backer.account }),
      "Campaign is not refundable",
    );

    await viem.assertions.revertWith(
      crowdfunding.write.withdrawFunds([0n], { account: backer.account }),
      "Only the campaign owner can withdraw",
    );

    await crowdfunding.write.withdrawFunds([0n]);
    assert.equal(await publicClient.getBalance({ address: crowdfunding.address }), 0n);
    assert.equal((await crowdfunding.read.getCampaigns())[0].withdrawn, true);
    await viem.assertions.revertWith(
      crowdfunding.write.withdrawFunds([0n]),
      "Campaign funds have already been withdrawn",
    );
    await viem.assertions.revertWith(
      crowdfunding.write.processRefunds([0n], { account: secondBacker.account }),
      "Campaign funds have already been withdrawn",
    );
  });

  it("allows anyone to enable refunds three weeks after an unpaid successful campaign deadline", async function () {
    const crowdfunding = await viem.deployContract("CrowdFunding");
    const publicClient = await viem.getPublicClient();
    const deadline = (await publicClient.getBlock()).timestamp + 100n;
    await crowdfunding.write.createCampaign([
      owner,
      "A cause",
      "A short story.",
      10n,
      deadline,
      ["https://example.com/image.png"],
    ]);

    await crowdfunding.write.donateToCampaign([0n], {
      account: backer.account,
      value: 6n,
    });
    await crowdfunding.write.donateToCampaign([0n], {
      account: secondBacker.account,
      value: 7n,
    });
    await viem.assertions.revertWith(
      crowdfunding.write.processRefunds([0n], { account: secondBacker.account }),
      "Refund delay has not elapsed",
    );

    await networkHelpers.time.increaseTo(deadline + 1n);
    await viem.assertions.revertWith(
      crowdfunding.write.claimRefund([0n], { account: backer.account }),
      "Campaign is not refundable",
    );

    const refundAvailableAt = deadline + (await crowdfunding.read.REFUND_DELAY());
    await networkHelpers.time.increaseTo(refundAvailableAt - 60n);
    await viem.assertions.revertWith(
      crowdfunding.write.processRefunds([0n], { account: secondBacker.account }),
      "Refund delay has not elapsed",
    );
    await networkHelpers.time.increaseTo(refundAvailableAt);
    await viem.assertions.revertWith(
      crowdfunding.write.withdrawFunds([0n]),
      "Refund window has elapsed",
    );

    await crowdfunding.write.processRefunds([0n], { account: secondBacker.account });
    assert.equal((await crowdfunding.read.getCampaigns())[0].refundsEnabled, true);
    await viem.assertions.revertWith(
      crowdfunding.write.withdrawFunds([0n]),
      "Refunds have been processed",
    );
    await viem.assertions.revertWith(
      crowdfunding.write.processRefunds([0n], { account: secondBacker.account }),
      "Refunds have already been processed",
    );

    await crowdfunding.write.claimRefund([0n], { account: backer.account });
    await crowdfunding.write.claimRefund([0n], { account: secondBacker.account });
    assert.equal(await crowdfunding.read.contributions([0n, backer.account.address]), 0n);
    assert.equal(await crowdfunding.read.contributions([0n, secondBacker.account.address]), 0n);
    assert.equal(await publicClient.getBalance({ address: crowdfunding.address }), 0n);
  });

  it("allows full donor refunds after an unsuccessful campaign deadline", async function () {
    const crowdfunding = await viem.deployContract("CrowdFunding");
    const publicClient = await viem.getPublicClient();
    const deadline = (await publicClient.getBlock()).timestamp + 100n;
    await crowdfunding.write.createCampaign([
      owner,
      "A cause",
      "A short story.",
      10n,
      deadline,
      ["https://example.com/image.png"],
    ]);

    await crowdfunding.write.donateToCampaign([0n], {
      account: backer.account,
      value: 3n,
    });
    await viem.assertions.revertWith(
      crowdfunding.write.claimRefund([0n], { account: backer.account }),
      "Campaign is not refundable",
    );

    await networkHelpers.time.increaseTo(deadline + 1n);
    await viem.assertions.revertWith(
      crowdfunding.write.claimRefund([0n], { account: secondBacker.account }),
      "No contribution to refund",
    );
    await crowdfunding.write.claimRefund([0n], { account: backer.account });
    await viem.assertions.revertWith(
      crowdfunding.write.claimRefund([0n], { account: backer.account }),
      "No contribution to refund",
    );

    assert.equal(await publicClient.getBalance({ address: crowdfunding.address }), 0n);
    assert.equal(await crowdfunding.read.contributions([0n, backer.account.address]), 0n);
    assert.equal(
      (await crowdfunding.read.getDonators([0n]))[0][0].toLowerCase(),
      backer.account.address.toLowerCase(),
    );

    await networkHelpers.time.increaseTo(deadline + (await crowdfunding.read.REFUND_DELAY()));
    await viem.assertions.revertWith(
      crowdfunding.write.processRefunds([0n], { account: secondBacker.account }),
      "Campaign did not reach its goal",
    );
  });

  it("cancels before withdrawal and lets every donor claim their full contribution", async function () {
    const crowdfunding = await viem.deployContract("CrowdFunding");
    const publicClient = await viem.getPublicClient();
    const deadline = (await publicClient.getBlock()).timestamp + 3600n;
    await crowdfunding.write.createCampaign([
      owner,
      "A cause",
      "A short story.",
      5n,
      deadline,
      ["https://example.com/image.png"],
    ]);
    await crowdfunding.write.donateToCampaign([0n], {
      account: backer.account,
      value: 3n,
    });
    await crowdfunding.write.donateToCampaign([0n], {
      account: secondBacker.account,
      value: 2n,
    });

    await viem.assertions.revertWith(
      crowdfunding.write.cancelCampaign([0n], { account: backer.account }),
      "Only the campaign owner can cancel",
    );
    await crowdfunding.write.cancelCampaign([0n]);

    assert.equal((await crowdfunding.read.getCampaigns())[0].cancelled, true);
    await viem.assertions.revertWith(
      crowdfunding.write.withdrawFunds([0n]),
      "Campaign has been cancelled",
    );
    await viem.assertions.revertWith(
      crowdfunding.write.donateToCampaign([0n], {
        account: backer.account,
        value: 1n,
      }),
      "Campaign has been cancelled",
    );

    await crowdfunding.write.claimRefund([0n], { account: backer.account });
    await crowdfunding.write.claimRefund([0n], { account: secondBacker.account });
    assert.equal(await publicClient.getBalance({ address: crowdfunding.address }), 0n);
    assert.equal(await crowdfunding.read.contributions([0n, backer.account.address]), 0n);
    assert.equal(await crowdfunding.read.contributions([0n, secondBacker.account.address]), 0n);
  });

  it("does not allow cancellation after payout or after the deadline", async function () {
    const crowdfunding = await viem.deployContract("CrowdFunding");
    const publicClient = await viem.getPublicClient();
    const deadline = (await publicClient.getBlock()).timestamp + 100n;
    await crowdfunding.write.createCampaign([
      owner,
      "A cause",
      "A short story.",
      1n,
      deadline,
      ["https://example.com/image.png"],
    ]);
    await crowdfunding.write.donateToCampaign([0n], { account: backer.account, value: 1n });
    await crowdfunding.write.withdrawFunds([0n]);
    await viem.assertions.revertWith(
      crowdfunding.write.cancelCampaign([0n]),
      "Campaign funds have already been withdrawn",
    );

    await crowdfunding.write.createCampaign([
      owner,
      "Another cause",
      "Another short story.",
      1n,
      deadline + 3600n,
      ["https://example.com/another-image.png"],
    ]);
    await networkHelpers.time.increaseTo(deadline + 3601n);
    await viem.assertions.revertWith(
      crowdfunding.write.cancelCampaign([1n]),
      "Campaign deadline has passed",
    );
  });
});
