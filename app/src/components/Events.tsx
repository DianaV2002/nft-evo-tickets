import { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import idl from '../nft_evo_tickets.json';
import { AnchorProvider } from '@coral-xyz/anchor';

const PROGRAM_ID = new PublicKey(idl.address);

const Events = ({ refreshCounter }: { refreshCounter: number }) => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        if (wallet.publicKey) {
            fetchEvents();
        }
    }, [wallet.publicKey, connection, refreshCounter]);

    const fetchEvents = async () => {
        try {
            if (!wallet.publicKey) return;
            const provider = new AnchorProvider(connection, wallet as any, AnchorProvider.defaultOptions());
            const program = new Program(idl as any, PROGRAM_ID, provider);
            const eventAccounts = await program.account.eventAccount.all();
            setEvents(eventAccounts);
        } catch (error) {
            console.error("Error fetching events:", error);
        }
    };

    return (
        <div>
            <h2>Events</h2>
            <button onClick={fetchEvents}>Refresh Events</button>
            {events.map((event, index) => (
                <div key={index} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
                    <p><strong>Event ID:</strong> {event.account.eventId.toString()}</p>
                    <p><strong>Name:</strong> {event.account.name}</p>
                    <p><strong>Authority:</strong> {event.account.authority.toBase58()}</p>
                </div>
            ))}
        </div>
    );
};

export default Events;
