document.querySelector('#wallet-connect .button').addEventListener('click', async () => {
    if (window.solana && window.solana.isPhantom) {
        try {
            const response = await window.solana.connect({ onlyIfTrusted: false });
            console.log('Connected with Public Key:', response.publicKey.toString());
            const address = response.publicKey.toString();
            const formattedAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;
            document.querySelector('#wallet-connect .button').textContent = formattedAddress;
            
            localStorage.setItem('walletAddress', address);

            const event = new CustomEvent('walletConnected', { detail: { address } });
            document.dispatchEvent(event);

            const iframeWindow = document.getElementById('jup').contentWindow;
            iframeWindow.postMessage({
              type: 'WALLET_CONNECTED',
              publicKey: address,
            }, window.location.origin); // Уточните origin
            
        } catch (err) {
            console.error('Error connecting to Phantom wallet:', err);
        }
    } else {
        alert('Phantom wallet not found! Please install it.');
    }
});

export class PhantomWalletAdapter {
    constructor() {
    this._onConnect = this._onConnect.bind(this);
    document.addEventListener('walletConnected', this._onConnect);
    }
    
    async connect() {
        document.querySelector('#wallet-connect .button').click();
    }
    
    _onConnect(event) {
        const { address } = event.detail;
        console.log(`Wallet connected with address: ${address}`);
    }
}

document.addEventListener('modalFullyLoaded', async (e) => {
    console.log('Event modalFullyLoaded:', e.detail);
    if(e.detail.modalId === '#modal2') { 
        try {
            const address = localStorage.getItem('walletAddress');
            if (!address) {
                console.error('walletAddress is not found in localStorage');
                return;
            }
            console.log('address = localStorage', address);
            setTimeout(async () => {
                await getTokensBalance(new solanaWeb3.PublicKey(address));
            }, 2500);
        } catch (err) {
            console.error('Error connecting to Phantom wallet:', err);
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    getWalletInfo().catch(console.error);
});

async function getSolBalance(publicKey) {
    const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('devnet'), 'confirmed');
    const solBalance = await connection.getBalance(publicKey);
    const solBalanceInSOL = solBalance / solanaWeb3.LAMPORTS_PER_SOL;
    return solBalanceInSOL;
}

async function getSPLTokenBalances(publicKey) {
    const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('devnet'), 'confirmed');
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, { 
        programId: new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') 
    });

    let splTokenBalances = [];

    for (const { account } of tokenAccounts.value) {
        const balance = account.data.parsed.info.tokenAmount.uiAmount;
        splTokenBalances.push({ balance });
    }

    return splTokenBalances;
}

async function getWalletInfo() {
    const address = localStorage.getItem('walletAddress');
    if (!address) {
        console.error('Wallet address is not found in localStorage');
        return;
    }

    try {
        const publicKey = new solanaWeb3.PublicKey(address);
        const solBalanceInSOL = await getSolBalance(publicKey);
        console.log('SOL Balance:', solBalanceInSOL);

        const splTokenBalances = await getSPLTokenBalances(publicKey);
        if (splTokenBalances.length > 0) {
            console.log('Token Balances:');
            splTokenBalances.forEach((token) => {
                console.log(token.balance);
            });
        } else {
            console.log('No SPL tokens found.');
        }

        const walletEvent = new CustomEvent('walletInfo', {
            detail: {
                address: address,
                solBalance: solBalanceInSOL,
                splTokenBalances: splTokenBalances
            }
        });
        document.dispatchEvent(walletEvent);
    } catch (err) {
        console.error('Error fetching wallet info:', err);
    }
}

document.addEventListener('DOMContentLoaded', (event) => {
    const requestTokensButton = document.getElementById('faucet');

    if (requestTokensButton) {
        requestTokensButton.addEventListener('click', function() {
            const walletAddress = localStorage.getItem('walletAddress');
            
            if (!walletAddress) {
                alert('No wallet set.');
                return;
            }

            fetch('https://hackathon-test-project.space:3001/request-tokens', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ walletAddress: walletAddress }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('The transaction is signed and sent. Transaction ID:', data.transactionId);
                    alert('The transaction is signed and sent.');
                } else {
                    console.error('Error:', data.message);
                    alert('Error sending tokens. Please try again later.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while processing your request.');
            });
        });
    }
});
