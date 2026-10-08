# Relay Meta Onboarding V1

## Goal

A merchant clicks "Connect Meta" and Relay automatically discovers the Meta assets required to create and manage campaigns.

The merchant should not need to know or copy IDs manually.

## Assets Relay must discover

### 1. Business Portfolio
Required to understand which business owns the advertising assets.

Permission candidate:
- business_management

### 2. Ad Account
Required to create campaigns, ad sets and ads.

Permission candidates:
- ads_management
- ads_read

### 3. Facebook Page
Required as the identity for Meta ad creatives.

Permission candidates:
- pages_show_list
- pages_read_engagement

### 4. Instagram Account
Required when Instagram is used as an ad identity.

Permission candidate:
- instagram_basic

### 5. Pixel / Dataset
Required for conversion tracking and sales optimization.

Permission / API requirements:
- To be confirmed

## Target merchant experience

1. Click "Connect Meta"
2. Authorize Relay
3. Relay discovers available Meta assets
4. Relay automatically chooses the obvious configuration when only one valid option exists
5. If multiple valid assets exist, Relay asks the merchant to choose using human-readable names
6. Relay stores the selected asset IDs internally

The merchant should never need to copy:
- Business IDs
- Ad Account IDs
- Page IDs
- Instagram IDs
- Pixel / Dataset IDs

## MVP permissions under evaluation

Core:
- ads_management
- ads_read
- pages_show_list
- business_management

Candidates:
- pages_read_engagement
- instagram_basic

Do not request unnecessary permissions.