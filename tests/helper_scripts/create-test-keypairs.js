import { Keypair } from "@solana/web3.js";
import fs from "fs";

function createAndSaveKeypair(fileName) {
    const keypair = Keypair.generate();
    
    const dir = 'tests/fixtures';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fileName, JSON.stringify(Array.from(keypair.secretKey)));
    console.log(`Created keypair and saved to ${fileName}. Public Key: ${keypair.publicKey.toBase58()}`);
}

createAndSaveKeypair("tests/fixtures/seller.json");
createAndSaveKeypair("tests/fixtures/buyer.json");
