# Mines Game - Arweave Integration

A pixel-art styled Mines Game with Arweave blockchain integration, using AO for randomness and SmartWeave for game logic.

## Demo Mode for Judges

This project is configured to run in "demo mode" for judging purposes. In this mode:

- No actual Arweave connections are needed
- No real AR tokens are spent
- All blockchain operations are simulated
- The contract ID is a test ID: `kHWu_t4g9PFA2u_V9_w-JF8PjbH0YX-3e6WAvWhB2T0`

To run the demo:

1. Clone the repository
2. Install dependencies: `npm install` or `pnpm install`
3. Run the development server: `npm run dev` or `pnpm dev`
4. Open http://localhost:3000 in your browser
5. Connect a mock wallet by clicking "Connect Wallet"
6. Play the game - all transactions are simulated!

## Overview

This project implements a Mines Game (similar to Minesweeper) with the following features:

- Pixelated retro-style UI
- Full Arweave wallet integration
- AO-powered random number generation for mine positions
- SmartWeave contract for handling bets and payouts
- Test mode for playing without real tokens

## Architecture

The application is built with:

- **Frontend**: Next.js, React, TailwindCSS
- **Blockchain**: Arweave, SmartWeave, AO

The system follows this architecture:

1. **User Interface** - React components for game interaction
2. **Game Logic** - Client-side logic for game state
3. **Blockchain Integration** - Integration with Arweave and AO
4. **Smart Contract** - SmartWeave contract for handling game state and funds

## Setup Instructions

### Prerequisites

- Node.js 16+ and npm/pnpm
- ArConnect browser extension for Arweave wallet functionality
- Arweave wallet with AR tokens

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mines-game
```

2. Install dependencies:
```bash
pnpm install
```

3. Copy the environment variables example file:
```bash
cp .env.local.example .env.local
```

4. Deploy the SmartWeave contract:
```bash
pnpm deploy:contract
```
   - Note the contract ID from the terminal output and update `NEXT_PUBLIC_MINES_CONTRACT_ID` in your `.env.local` file

5. Deploy the AO process:
```bash
pnpm deploy:ao
```
   - Note the process ID from the terminal output and update `NEXT_PUBLIC_AO_PROCESS_ID` in your `.env.local` file

6. Start the development server:
```bash
pnpm dev
```

7. Build for production:
```bash
pnpm build
```

8. Start the production server:
```bash
pnpm start
```

## Project Structure

- `app/` - Next.js application routes and layout
- `components/` - React components including the main MinesGame component 
- `contracts/` - Smart contracts and AO processes
- `hooks/` - React hooks including Arweave wallet integration
- `lib/` - Utility functions and blockchain integration code
- `public/` - Static assets
- `styles/` - CSS styles

## Contract Deployment

### SmartWeave Contract

The SmartWeave contract (`contracts/mines-game-contract.js`) handles:
- Placing bets
- Storing game state
- Calculating winnings
- Processing payouts

### AO Process

The AO Process (`contracts/mines-game-ao-process.lua`) provides:
- True randomness for mine positions
- Game result verification
- Trustless gameplay mechanics

## Production Deployment

To deploy to production:

1. Set up environment variables:
   - `NEXT_PUBLIC_MINES_CONTRACT_ID`: Your deployed smart contract ID
   - `NEXT_PUBLIC_AO_PROCESS_ID`: Your deployed AO process ID

2. Build the application:
```bash
pnpm build
```

3. Deploy to your preferred hosting service (Vercel, Netlify, etc.)

4. Make sure your hosting service has access to the environment variables

## Security Considerations

- The contract includes a 3% house edge for sustainability
- AO process ensures fair randomness that cannot be predicted
- All transactions are recorded on the Arweave blockchain for transparency
- Test mode is available for trying the game without spending AR tokens

## License

MIT 