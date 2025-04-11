# Mines Game Contracts

This directory contains the smart contracts and AO processes required for the Mines Game:

1. `mines-game-contract.js` - SmartWeave contract for handling game transactions and state
2. `mines-game-ao-process.lua` - AO process for random number generation and verification

## Deploying the SmartWeave Contract

The SmartWeave contract manages bets, game states, and payouts for the Mines Game.

### Prerequisites

- ArConnect browser extension installed
- AR tokens for deployment fees
- Node.js environment

### Deployment Steps

1. Install the SmartWeave CLI:
```bash
npm install -g smartweave
```

2. Make sure you have your wallet keyfile ready (or use ArConnect)

3. Deploy the contract:
```bash
smartweave deploy mines-game-contract.js initial-state.json --key-file wallet.json
```

Alternatively, you can use the Arweave Deploy tool at https://deploy.arweave.net/

4. Note the Contract ID that is generated after deployment.

5. Update the Contract ID in your project:
   - Open `lib/arweave-integration.ts`
   - Replace the placeholder `REPLACE_WITH_YOUR_CONTRACT_ID` with your actual Contract ID

## Deploying the AO Process

The AO process provides random number generation for mine positions and result verification.

### Prerequisites

- AO CLI tool installed
- AR tokens for deployment fees

### Deployment Steps

1. Install the AO CLI tool:
```bash
npm install -g @permaweb/ao
```

2. Initialize the AO process:
```bash
ao create-process --init=mines-game-ao-process.lua --wallet=wallet.json
```

3. Note the Process ID that is generated after deployment.

4. Update the Process ID in your project:
   - Open `lib/ao-randomness.ts`
   - Replace the placeholder `REPLACE_WITH_YOUR_AO_PROCESS_ID` with your actual Process ID

## Testing the Deployed Contracts

### SmartWeave Contract

You can test the SmartWeave contract by sending test interactions:
```bash
smartweave write $CONTRACT_ID --key-file wallet.json --input '{"function":"placeBet","betAmount":0.1,"minesCount":5}'
```

### AO Process

You can test the AO process by sending messages:
```bash
ao message $PROCESS_ID --data '{"totalTiles":25,"count":5}' --tags Action=GetRandomness --wallet=wallet.json
```

## Contract Updating

### SmartWeave Contract

To update the contract (if you are the owner):
```bash
smartweave update $CONTRACT_ID mines-game-contract.js --key-file wallet.json
```

### AO Process

AO processes cannot be updated. To make changes, deploy a new process and update the ID in the application.

## Troubleshooting

### SmartWeave Contract

- Make sure the wallet you're using has enough AR for the transaction fee
- Verify that your contract source code is valid JavaScript
- Check for syntax errors in your transaction input

### AO Process

- Ensure the Lua code is valid
- Make sure your wallet has enough AR to cover the transaction
- Verify that your message data and tags are properly formatted 