// Local deployment script for the Mines Game contract using Arlocal
const fs = require('fs');
const Arweave = require('arweave');
const { SmartWeaveNodeFactory } = require('redstone-smartweave');
const ArLocal = require('arlocal').default;

async function deployLocalContract() {
  // Start ArLocal instance
  const arlocal = new ArLocal(1984, false);
  await arlocal.start();
  console.log('ArLocal test server running on port 1984');

  // Initialize Arweave with ArLocal
  const arweave = Arweave.init({
    host: 'localhost',
    port: 1984,
    protocol: 'http'
  });

  try {
    // Generate a test wallet
    const wallet = await arweave.wallets.generate();
    const walletAddress = await arweave.wallets.jwkToAddress(wallet);
    
    // Fund the wallet with test AR
    await arweave.api.get(`mint/${walletAddress}/1000000000000`);
    
    // Initialize SmartWeave
    const smartweave = SmartWeaveNodeFactory.memCached(arweave);
    
    // Load contract source and initial state
    const contractSrc = fs.readFileSync('./mines-game-contract.js', 'utf8');
    const initialState = JSON.parse(fs.readFileSync('./initial-state.json', 'utf8'));
    
    // Set the wallet address as owner in the initial state
    initialState.owner = walletAddress;
    
    console.log('Deploying contract locally...');
    
    // Deploy contract
    const contractTxId = await smartweave.createContract.deploy({
      wallet,
      initState: JSON.stringify(initialState),
      src: contractSrc,
    });
    
    console.log(`\nContract deployed successfully!`);
    console.log(`\nContract ID: ${contractTxId}`);
    
    // Create .env file with contract ID
    const envContent = `NEXT_PUBLIC_MINES_CONTRACT_ID=${contractTxId}\n`;
    fs.writeFileSync('../.env.local', envContent);
    
    console.log(`\nContract ID saved to .env.local file as NEXT_PUBLIC_MINES_CONTRACT_ID`);
    console.log(`\nUse this contract ID in your development environment`);
    
    // Keep arlocal running for testing
    console.log('\nArLocal server is still running. Press Ctrl+C to stop it when done testing.');
    
  } catch (error) {
    console.error('Error deploying contract:', error);
    await arlocal.stop();
  }
}

// Run the deployment
deployLocalContract(); 