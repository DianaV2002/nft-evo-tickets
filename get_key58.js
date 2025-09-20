import fs from "fs";
import bs58 from "bs58"; // Use default import for bs58

try {
  const keypairArray = JSON.parse(fs.readFileSync("/home/diana/.config/solana/id.json")); // !! VERIFY THIS PATH IS CORRECT !!
  const secretKey = bs58.encode(Buffer.from(keypairArray));
  console.log(secretKey);
} catch (e) {
  console.error("Error reading or decoding keypair:", e);
}