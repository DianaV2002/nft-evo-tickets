/**
 * Image Upload Service
 *
 * This service handles uploading event cover photos to IPFS via Pinata.
 *
 * Environment variables required (in .env):
 * - PINATA_JWT: Your Pinata JWT token
 * - PINATA_GATEWAY: Your Pinata gateway URL (optional)
 */

/**
 * Upload image to Pinata IPFS using JWT authentication
 */
export async function uploadToPinata(file: File): Promise<string> {
  const jwt = import.meta.env.PINATA_JWT;
  const gateway = import.meta.env.PINATA_GATEWAY || "gateway.pinata.cloud";

  if (!jwt) {
    throw new Error("Pinata JWT not configured. Please add PINATA_JWT to your .env file");
  }

  const formData = new FormData();
  formData.append("file", file);

  // Add metadata
  const metadata = JSON.stringify({
    name: `event-cover-${Date.now()}-${file.name}`,
  });
  formData.append("pinataMetadata", metadata);

  // Add pinning options (optional)
  const options = JSON.stringify({
    cidVersion: 1,
  });
  formData.append("pinataOptions", options);

  console.log("Uploading to Pinata IPFS...");

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Pinata upload failed:", error);
    throw new Error(`Failed to upload image to IPFS: ${response.statusText}`);
  }

  const result = await response.json();
  const ipfsHash = result.IpfsHash;

  console.log("Upload successful! IPFS Hash:", ipfsHash);

  // Return the IPFS gateway URL using the configured gateway
  return `https://${gateway}/ipfs/${ipfsHash}`;
}

/**
 * Upload image and return URL for blockchain storage
 * Uses Pinata IPFS for decentralized storage
 */
export async function uploadEventImage(file: File | null): Promise<string> {
  if (!file) {
    return ""; // No image
  }

  try {
    // Upload to Pinata IPFS
    const ipfsUrl = await uploadToPinata(file);
    console.log("Event cover image uploaded:", ipfsUrl);
    return ipfsUrl;
  } catch (error) {
    console.error("Failed to upload image:", error);
    // Return empty string on error - will show placeholder in UI
    return "";
  }
}

/**
 * Get display URL for an event cover image
 * Handles various URL formats (IPFS, HTTP, data URLs)
 */
export function getImageDisplayUrl(coverImageUrl: string): string | null {
  if (!coverImageUrl) {
    return null;
  }

  // IPFS URLs (ipfs://hash format)
  if (coverImageUrl.startsWith("ipfs://")) {
    const hash = coverImageUrl.replace("ipfs://", "");
    const gateway = import.meta.env.PINATA_GATEWAY || "gateway.pinata.cloud";
    return `https://${gateway}/ipfs/${hash}`;
  }

  // Already a full URL (https://gateway.pinata.cloud/ipfs/hash)
  if (coverImageUrl.startsWith("http://") || coverImageUrl.startsWith("https://")) {
    return coverImageUrl;
  }

  // Data URL
  if (coverImageUrl.startsWith("data:")) {
    return coverImageUrl;
  }

  return null;
}
