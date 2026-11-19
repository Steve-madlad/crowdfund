// SPDX-License-Identifier: MIT
pragma solidity ^0.8.38;

contract CrowdFunding {
  uint256 public constant MAX_CAMPAIGN_IMAGES = 5;
  uint256 public constant MAX_IMAGE_URL_BYTES = 512;
  uint256 public constant REFUND_DELAY = 21 days;

  struct Campaign {
    address owner;
    string title;
    string description;
    uint256 target;
    uint256 deadline;
    uint256 amountCollected;
    string image;
    bool cancelled;
    bool withdrawn;
    bool refundsEnabled;
    string[] additionalImages;
    address[] donators;
    uint256[] donations;
  }

  mapping(uint256 => Campaign) public campaigns;
  mapping(uint256 => mapping(address => uint256)) public contributions;

  uint256 public numberOfCampaigns = 0;

  event CampaignCreated(
    uint256 indexed campaignId,
    address indexed owner,
    uint256 target,
    uint256 deadline
  );
  event DonationReceived(
    uint256 indexed campaignId,
    address indexed donor,
    uint256 amount,
    uint256 totalCollected
  );
  event CampaignCancelled(uint256 indexed campaignId, address indexed owner);
  event FundsWithdrawn(uint256 indexed campaignId, address indexed owner, uint256 amount);
  event RefundsProcessed(uint256 indexed campaignId, address indexed caller);
  event RefundClaimed(uint256 indexed campaignId, address indexed donor, uint256 amount);

  function createCampaign(
    address _owner,
    string memory _title,
    string memory _description,
    uint256 _target,
    uint256 _deadline,
    string[] memory _images) public returns (uint256) {
      Campaign storage campaign = campaigns[numberOfCampaigns];

      require(_owner != address(0), "Campaign owner cannot be zero");
      require(bytes(_title).length > 0, "Campaign title is required");
      require(bytes(_description).length > 0, "Campaign story is required");
      require(_target > 0, "Campaign goal must be greater than zero");
      require(_deadline > block.timestamp, "The deadline should be a date in the future.");
      require(
        _images.length > 0 && _images.length <= MAX_CAMPAIGN_IMAGES,
        "Campaign image count is out of range"
      );

      campaign.owner = _owner;
      campaign.title = _title;
      campaign.description = _description;
      campaign.target = _target;
      campaign.deadline = _deadline;
      campaign.amountCollected = 0;
      campaign.image = _images[0];
      campaign.cancelled = false;
      campaign.withdrawn = false;
      campaign.refundsEnabled = false;

      bytes memory httpsPrefix = bytes("https://");
      for (uint256 i = 0; i < _images.length; i++) {
        bytes memory imageUrl = bytes(_images[i]);
        require(
          imageUrl.length > httpsPrefix.length && imageUrl.length <= MAX_IMAGE_URL_BYTES,
          "Campaign image URL length is out of range"
        );
        for (uint256 j = 0; j < httpsPrefix.length; j++) {
          require(imageUrl[j] == httpsPrefix[j], "Campaign image URL must use HTTPS");
        }
        for (uint256 j = 0; j < i; j++) {
          require(
            keccak256(bytes(_images[j])) != keccak256(imageUrl),
            "Campaign image URLs must be unique"
          );
        }
        if (i > 0) {
          campaign.additionalImages.push(_images[i]);
        }
      }

      numberOfCampaigns++;
      emit CampaignCreated(numberOfCampaigns - 1, _owner, _target, _deadline);

      return numberOfCampaigns - 1;
  }

  function donateToCampaign(uint256 _id) public payable {
    uint256 amount = msg.value;

    require(_id < numberOfCampaigns, "Campaign does not exist");
    Campaign storage campaign = campaigns[_id];

    require(amount > 0, "Donation must be greater than zero");
    require(block.timestamp <= campaign.deadline, "Campaign has ended");
    require(!campaign.cancelled, "Campaign has been cancelled");
    require(!campaign.withdrawn, "Campaign funds have been withdrawn");
    require(campaign.amountCollected < campaign.target, "Campaign goal has been reached");

    campaign.donators.push(msg.sender);
    campaign.donations.push(amount);
    campaign.amountCollected += amount;
    contributions[_id][msg.sender] += amount;

    emit DonationReceived(_id, msg.sender, amount, campaign.amountCollected);
  }

  function withdrawFunds(uint256 _id) public {
    require(_id < numberOfCampaigns, "Campaign does not exist");
    Campaign storage campaign = campaigns[_id];

    require(msg.sender == campaign.owner, "Only the campaign owner can withdraw");
    require(!campaign.cancelled, "Campaign has been cancelled");
    require(!campaign.withdrawn, "Campaign funds have already been withdrawn");
    require(!campaign.refundsEnabled, "Refunds have been processed");
    require(!_refundWindowElapsed(campaign.deadline), "Refund window has elapsed");
    require(campaign.amountCollected >= campaign.target, "Campaign goal has not been reached");

    uint256 amount = campaign.amountCollected;
    campaign.withdrawn = true;

    (bool sent,) = payable(campaign.owner).call{value: amount}("");
    require(sent, "Transfer failed");

    emit FundsWithdrawn(_id, campaign.owner, amount);
  }

  function processRefunds(uint256 _id) public {
    require(_id < numberOfCampaigns, "Campaign does not exist");
    Campaign storage campaign = campaigns[_id];

    require(!campaign.withdrawn, "Campaign funds have already been withdrawn");
    require(!campaign.cancelled, "Campaign has been cancelled");
    require(_refundWindowElapsed(campaign.deadline), "Refund delay has not elapsed");
    require(campaign.amountCollected >= campaign.target, "Campaign did not reach its goal");
    require(!campaign.refundsEnabled, "Refunds have already been processed");

    campaign.refundsEnabled = true;
    emit RefundsProcessed(_id, msg.sender);
  }

  function cancelCampaign(uint256 _id) public {
    require(_id < numberOfCampaigns, "Campaign does not exist");
    Campaign storage campaign = campaigns[_id];

    require(msg.sender == campaign.owner, "Only the campaign owner can cancel");
    require(block.timestamp < campaign.deadline, "Campaign deadline has passed");
    require(!campaign.cancelled, "Campaign has already been cancelled");
    require(!campaign.withdrawn, "Campaign funds have already been withdrawn");

    campaign.cancelled = true;
    emit CampaignCancelled(_id, campaign.owner);
  }

  function claimRefund(uint256 _id) public {
    require(_id < numberOfCampaigns, "Campaign does not exist");
    Campaign storage campaign = campaigns[_id];
    bool failed = block.timestamp > campaign.deadline &&
      campaign.amountCollected < campaign.target;

    require(campaign.cancelled || failed || campaign.refundsEnabled, "Campaign is not refundable");

    uint256 amount = contributions[_id][msg.sender];
    require(amount > 0, "No contribution to refund");

    contributions[_id][msg.sender] = 0;
    (bool sent,) = payable(msg.sender).call{value: amount}("");
    require(sent, "Refund transfer failed");

    emit RefundClaimed(_id, msg.sender, amount);
  }

  function _refundWindowElapsed(uint256 _deadline) internal view returns (bool) {
    return block.timestamp >= _deadline && block.timestamp - _deadline >= REFUND_DELAY;
  }

  function getDonators(uint256 _id) public view returns (address[] memory, uint256[] memory) {
    return (campaigns[_id].donators, campaigns[_id].donations);
  }

  function getCampaignImages(uint256 _id) public view returns (string[] memory) {
    require(_id < numberOfCampaigns, "Campaign does not exist");
    Campaign storage campaign = campaigns[_id];
    string[] memory images = new string[](campaign.additionalImages.length + 1);
    images[0] = campaign.image;
    for (uint256 i = 0; i < campaign.additionalImages.length; i++) {
      images[i + 1] = campaign.additionalImages[i];
    }
    return images;
  }

  function getCampaigns() public view returns (Campaign[] memory) {
    Campaign[] memory allCampaigns = new Campaign[](numberOfCampaigns);

    for (uint i = 0; i < numberOfCampaigns; i++) {
      Campaign storage item = campaigns[i];

      allCampaigns[i] = item;
    }

    return allCampaigns;
  }
}