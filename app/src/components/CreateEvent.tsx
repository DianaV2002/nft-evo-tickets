import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, web3, AnchorProvider, BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import idl from '../nft_evo_tickets.json';

const PROGRAM_ID = new PublicKey(idl.address);

const CreateEvent = ({ onEventCreated }: { onEventCreated: () => void }) => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [eventName, setEventName] = useState('');
    const [loading, setLoading] = useState(false);

    const getProvider = () => {
        if (!wallet || !wallet.wallet) {
            return null;
        }
        return new AnchorProvider(connection, wallet as any, AnchorProvider.defaultOptions());
    };

    const handleCreateEvent = async () => {
        const provider = getProvider();
        if (!provider || !provider.wallet.publicKey) {
            alert("Wallet not connected!");
            return;
        }

        setLoading(true);
        try {
            const program = new Program(idl as any, PROGRAM_ID, provider);
            const eventId = new BN(Date.now() + Math.random() * 1000);
            const startTs = new BN(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now
            const endTs = new BN(Math.floor(Date.now() / 1000) + 7200);   // 2 hours from now
            
            const [eventPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("nft-evo-tickets"), Buffer.from("event"), eventId.toArrayLike(Buffer, "le", 8)],
                program.programId
            );

            const tx = await program.methods
                .createEvent(eventId, eventName, startTs, endTs)
                .accounts({
                    organizer: provider.wallet.publicKey,
                    eventAccount: eventPda,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            console.log("Event created successfully!", tx);
            alert("Event created successfully!");
            setEventName('');
            onEventCreated();
        } catch (error) {
            console.error("Error creating event:", error);
            alert("Error creating event. See console for details.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2>Create New Event</h2>
            <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Enter event name"
                style={{ marginRight: '10px' }}
            />
            <button onClick={handleCreateEvent} disabled={!eventName || loading}>
                {loading ? 'Creating...' : 'Create Event'}
            </button>
        </div>
    );
};

export default CreateEvent;
