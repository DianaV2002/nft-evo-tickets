import Bundlr from "@bundlr-network/client";
import bs58 from "bs58";

export async function getBundlr(solSecretKeyB58: string) {
  const secretKey = bs58.decode(solSecretKeyB58.trim());
  // endpoint can be node1/node2; currency "solana"
  const bundlr = new Bundlr("https://devnet.bundlr.network", "solana", secretKey, 
  { providerUrl : "https://api.devnet.solana.com" });
  await bundlr.ready();
  return bundlr;
}

export async function uploadJsonToArweave(bundlr: any, json: any) {
  const data = Buffer.from(JSON.stringify(json), "utf8");
  console.log(`Uploading JSON metadata (${data.length} bytes)...`);

  const tx = await bundlr.upload(data, {
    tags: [{ name: "Content-Type", value: "application/json" }],
  });

  console.log('Bundlr upload response:', tx);
  const id = tx?.id || tx;

  if (!id) {
    throw new Error('Failed to get transaction ID from Bundlr upload');
  }

  const url = `https://arweave.net/${id}`;
  console.log(`JSON uploaded to: ${url}`);

  // Wait a moment for propagation
  await new Promise(resolve => setTimeout(resolve, 1000));

  return { id, url };
}

export async function uploadPngToArweave(bundlr: any, pngBuffer: Buffer) {
  console.log(`Uploading PNG image (${pngBuffer.length} bytes)...`);

  const tx = await bundlr.upload(pngBuffer, {
    tags: [{ name: "Content-Type", value: "image/png" }],
  });

  console.log('Bundlr upload response:', tx);
  const id = tx?.id || tx;

  if (!id) {
    throw new Error('Failed to get transaction ID from Bundlr upload');
  }

  const url = `https://arweave.net/${id}`;
  console.log(`PNG uploaded to: ${url}`);

  // Wait a moment for propagation
  await new Promise(resolve => setTimeout(resolve, 1000));

  return { id, url };
}

export async function ensureBundlrFunds(bundlr: any, bytesNeeded: number) {
  console.log(`Checking Bundlr funds for ${bytesNeeded} bytes...`);

  const price = await bundlr.getPrice(bytesNeeded);
  const bal = await bundlr.getLoadedBalance();

  console.log(`Upload price: ${price.toString()} atomic units`);
  console.log(`Current balance: ${bal.toString()} atomic units`);

  if (bal.lt(price)) {
    const diff = price.minus(bal);
    console.log(`Funding ${diff.toString()} atomic units...`);

    const fundResult = await bundlr.fund(diff);
    console.log('Fund result:', fundResult);

    // Wait for funding to confirm
    await new Promise(resolve => setTimeout(resolve, 2000));
  } else {
    console.log('Sufficient funds available');
  }
}
