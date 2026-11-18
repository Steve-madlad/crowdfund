// SPDX-License-Identifier: MIT
pragma solidity ^0.8.38;

contract CrowdFunding {
  uint256 public constant MAX_CAMPAIGN_IMAGES = 5;
  uint256 public constant MAX_IMAGE_URL_BYTES = 512;

  struct Campaign {
    address owner;
    string title;
    string description;
    uint256 target;
    uint256 deadline;
    uint256 amountCollected;
    string image;
    string[] additionalImages;
    address[] donators;
    uint256[] donations;
  }

  mapping(uint256 => Campaign) public campaigns;

  uint256 public numberOfCampaigns = 0;

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
      
      return numberOfCampaigns - 1;
  }

  function donateToCampaign(uint256 _id) public payable {
    uint256 amount = msg.value;

    require(_id < numberOfCampaigns, "Campaign does not exist");
    Campaign storage campaign = campaigns[_id];

    require(amount > 0, "Donation must be greater than zero");
    require(block.timestamp <= campaign.deadline, "Campaign has ended");
    require(campaign.amountCollected < campaign.target, "Campaign goal has been reached");

    campaign.donators.push(msg.sender);
    campaign.donations.push(amount);
    campaign.amountCollected += amount;

    (bool sent,) = payable(campaign.owner).call{value: amount}("");
    
    require(sent, "Transfer failed");
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