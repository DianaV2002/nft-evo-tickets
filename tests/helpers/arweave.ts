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
  const tx = await bundlr.upload(data, {
    tags: [{ name: "Content-Type", value: "application/json" }],
  });
  const id = tx?.id ?? tx?.data?.id ?? tx;
  const url = `https://arweave.net/${id}`;
  return { id, url };
}

export async function uploadPngToArweave(bundlr: any, pngBuffer: Buffer) {
  const tx = await bundlr.upload(pngBuffer, {
    tags: [{ name: "Content-Type", value: "image/png" }],
  });
  const id = tx?.id ?? tx?.data?.id ?? tx;
  const url = `https://arweave.net/${id}`;
  return { id, url };
}

export async function ensureBundlrFunds(bundlr: any, bytesNeeded: number) {
  const price = await bundlr.getPrice(bytesNeeded);
  const bal = await bundlr.getLoadedBalance();

  if (bal.lt(price)) {
    const diff = price.minus(bal);
    // fund the shortfall (Bundlr expects atomic units of the currency, lamports for sol)
    await bundlr.fund(diff);
  }
}
