import React, { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, web3, AnchorProvider, utils } from '@project-serum/anchor';
import idl from '../nft_evo_tickets.json';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";


const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string);
const programId = new web3.PublicKey(idl.address);

export const MintTickets = () => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [eventPubKey, setEventPubKey] = useState('');
    const [ownerPubKey, setOwnerPubKey] = useState('');
    const [numTickets, setNumTickets] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const getProgram = () => {
        const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
        return new Program(idl_object, programId, provider);
    }

    const handleMint = async () => => {
        if (!wallet.publicKey || !eventPubKey || !ownerPubKey) return;
        setIsLoading(true);

        const program = getProgram();
        const eventKey = new web3.PublicKey(eventPubKey);
        const ownerKey = new web3.PublicKey(ownerPubKey);

        const metaplexMetadataProgramId = new web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

        try {
            let transactions = [];
            for (let i = 0; i < numTickets; i++) {
                const nftMint = web3.Keypair.generate();

                const [ticketAccount] = await web3.PublicKey.findProgramAddress(
                    [
                        Buffer.from("nft-evo-tickets"),
                        Buffer.from("ticket"),
                        eventKey.toBuffer(),
                        ownerKey.toBuffer(),
                        nftMint.publicKey.toBuffer(), // Making it unique per mint
                    ],
                    program.programId
                );

                const [metadata] = await web3.PublicKey.findProgramAddress(
                    [
                        Buffer.from("metadata"),
                        metaplexMetadataProgramId.toBuffer(),
                        nftMint.publicKey.toBuffer(),
                    ],
                    metaplexMetadataProgramId
                );

                const [masterEdition] = await web3.PublicKey.findProgramAddress(
                    [
                        Buffer.from("metadata"),
                        metaplexMetadataProgramId.toBuffer(),
                        nftMint.publicKey.toBuffer(),
                        Buffer.from("edition"),
                    ],
                    metaplexMetadataProgramId
                );
                
                const tokenAccount = await utils.token.associatedAddress({ mint: nftMint.publicKey, owner: ownerKey });

                const tx = await program.methods
                    .mintTicket(null, null)
                    .accounts({
                        authority: wallet.publicKey,
                        eventAccount: eventKey,
                        ticketAccount,
                        owner: ownerKey,
                        nftMint: nftMint.publicKey,
                        metadata,
                        masterEdition,
                        tokenAccount,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                        systemProgram: web3.SystemProgram.programId,
                        tokenMetadataProgram: metaplexMetadataProgramId,
                        rent: web3.SYSVAR_RENT_PUBKEY,
                    })
                    .signers([nftMint]) // Only nftMint needs to be a signer as it's a new keypair
                    .transaction();
                
                transactions.push(tx);
            }

            console.log(`Preparing to send ${transactions.length} transactions.`);
            
            // This is a simplified sending logic. For a better UX,
            // you'd want to use a library that handles sending transactions in batches
            // and confirming them, perhaps with progress updates.
            const signedTxs = await wallet.signAllTransactions(transactions);
            
            let signatures = [];
            for (const tx of signedTxs) {
                const sig = await connection.sendRawTransaction(tx.serialize());
                await connection.confirmTransaction(sig, 'confirmed');
                signatures.push(sig);
            }
            
            console.log("All transactions confirmed:", signatures);
            alert(`${numTickets} tickets minted successfully!`);

        } catch (error) {
            console.error("Error during batch minting:", error);
            alert('Error during batch minting. Check console.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <h2>Mint Tickets</h2>
            <input
                type="text"
                placeholder="Event Public Key"
                onChange={(e) => setEventPubKey(e.target.value)}
                value={eventPubKey}
            />
            <input
                type="text"
                placeholder="Owner Public Key"
                onChange={(e) => setOwnerPubKey(e.target.value)}
                value={ownerPubKey}
            />
            <input
                type="number"
                placeholder="Number of Tickets"
                onChange={(e) => setNumTickets(parseInt(e.target.value))}
                value={numTickets}
                min="1"
            />
            <button onClick={handleMint} disabled={!wallet.publicKey || isLoading}>
                {isLoading ? 'Minting...' : 'Mint Tickets'}
            </button>
        </div>
    );
};
