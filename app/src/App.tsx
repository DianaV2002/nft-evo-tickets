import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import Events from './components/Events';
import CreateEvent from './components/CreateEvent';
import { MintTickets } from './components/MintTickets';
import { useState } from 'react';

function App() {
  const { publicKey } = useWallet();
  // State to refresh events list after a new one is created
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEventCreated = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>NFT Evo Tickets</h1>
        <WalletMultiButton />
      </header>
      {publicKey && <p>Connected: {publicKey.toBase58()}</p>}
      
      <hr style={{ margin: '20px 0' }} />
      
      <main>
        {publicKey ? (
          <div>
            <CreateEvent onEventCreated={handleEventCreated} />
            <MintTickets />
            <hr style={{ margin: '20px 0' }} />
            <Events refreshCounter={refreshKey} />
          </div>
        ) : (
          <p>Please connect your wallet to get started.</p>
        )}
      </main>
    </div>
  );
}

export default App;
