# AO Process Integration Instructions

## Overview
The mines game now has proper AO process integration for randomness generation. This provides truly decentralized and verifiable randomness that cannot be predicted or manipulated.

## Deployment Steps

### 1. Deploy the AO Process
```bash
# Install the AO CLI if you haven't already
npm install -g @permaweb/ao

# Make sure your wallet.json file is in the root directory
# Deploy the AO process
pnpm deploy:ao

# Note the process ID that is returned
# Example output:
# Process created with process id: <YOUR_PROCESS_ID>
```

### 2. Update the Environment Configuration
```bash
# Create or edit the .env.local file
# Add the process ID that was returned
NEXT_PUBLIC_AO_PROCESS_ID=YOUR_PROCESS_ID_HERE

# Make sure the file also contains the other required environment variables
NEXT_PUBLIC_MINES_CONTRACT_ID=YOUR_CONTRACT_ID_HERE
NEXT_PUBLIC_ARWEAVE_HOST=arweave.net
NEXT_PUBLIC_ARWEAVE_PORT=443
NEXT_PUBLIC_ARWEAVE_PROTOCOL=https
```

### 3. Testing the AO Process
You can test the AO process directly with the AO CLI:

```bash
# Replace YOUR_PROCESS_ID with the process ID you obtained
ao message YOUR_PROCESS_ID --data '{}' --tags Action=GetRandomness --tags Range=25 --tags Count=5
```

This should return a JSON response like this:
```json
{
  "success": true,
  "gameId": "12345_abc123",
  "positions": [3, 7, 11, 15, 22]
}
```

### 4. Start the Development Server
```bash
pnpm dev
```

## Verifying Integration

To verify that the AO process integration is working correctly:

1. Open the game in your browser
2. Connect your Arweave wallet
3. Start a game by placing a bet
4. Check the browser console for AO process-related logs:
   - "Requesting randomness from AO process..."
   - "Received response from AO process: {...}"

If there are any issues with the AO process, the game will fall back to local randomness generation, but you'll see warning logs in the console.

## Troubleshooting

- **Issue**: AO process returns an error
  - **Solution**: Check that your wallet has enough AR for the transaction

- **Issue**: Cannot connect to AO
  - **Solution**: Make sure the AO process ID in .env.local is correct

- **Issue**: Game not using AO randomness
  - **Solution**: Verify that you see AO-related logs in the browser console

## Selection Criteria for Arweave Hacker House

This implementation meets the Arweave Hacker House selection criteria by:

1. Using an AO process for critical game functionality
2. Implementing proper error handling and fallbacks
3. Creating a complete end-to-end integration between frontend and AO process
4. Providing a verifiable and transparent randomness mechanism
