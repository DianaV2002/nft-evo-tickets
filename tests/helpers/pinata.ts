import { PinataSDK } from "pinata";

export async function getPinataClient(jwt: string, gateway?: string): Promise<PinataSDK> {
  if (!jwt || jwt === 'undefined' || jwt === '[NOT SET]') {
    throw new Error('PINATA_JWT is required. Get one from https://pinata.cloud');
  }

  if (!jwt.startsWith('eyJ')) {
    throw new Error('Invalid Pinata JWT format. Should start with "eyJ". Get a valid JWT from https://pinata.cloud');
  }

  const pinata = new PinataSDK({
    pinataJwt: jwt,
    pinataGateway: gateway || "gateway.pinata.cloud"
  });

  return pinata;
}

export async function uploadImageToPinata(client: PinataSDK, imageBuffer: Buffer, filename: string = 'ticket.png'): Promise<string> {
  console.log(`Uploading image to Pinata (${imageBuffer.length} bytes)...`);

  try {x
    const file = new File([imageBuffer], filename, { type: 'image/png' });

    const upload = await client.upload.public.file(file);

    const gateway = process.env.PINATA_GATEWAY || "gateway.pinata.cloud";
    const url = `https://${gateway}/ipfs/${upload.cid}`;
    console.log(`Image uploaded to IPFS: ${url}`);

    return url;
  } catch (error) {
    console.error('Failed to upload image to Pinata:', error);
    throw error;
  }
}

export async function uploadImageToPinataPrivate(client: PinataSDK, imageBuffer: Buffer, filename: string = 'ticket.png'): Promise<{ url: string; cid: string }> {
  console.log(`Uploading private image to Pinata (${imageBuffer.length} bytes)...`);

  try {
    const file = new File([imageBuffer], filename, { type: 'image/png' });

    const upload = await client.upload.private.file(file);

    const gateway = process.env.PINATA_GATEWAY || "gateway.pinata.cloud";
    const url = `https://${gateway}/ipfs/${upload.cid}`;
    console.log(`Private image uploaded to IPFS: ${url}, CID: ${upload.cid}`);

    return { url, cid: upload.cid };
  } catch (error) {
    console.error('Failed to upload private image to Pinata:', error);
    throw error;
  }
}

export async function uploadMetadataToPinata(client: PinataSDK, metadata: any): Promise<string> {
  console.log('Uploading metadata to Pinata...');

  try {
    const upload = await client.upload.public.json(metadata);

    const gateway = process.env.PINATA_GATEWAY || "gateway.pinata.cloud";
    const url = `https://${gateway}/ipfs/${upload.cid}`;
    console.log(`Metadata uploaded to IPFS: ${url}`);
    console.log('Metadata content:', metadata);

    return url;
  } catch (error) {
    console.error('Failed to upload metadata to Pinata:', error);
    throw error;
  }
}

export async function uploadCompleteNFTToPinata(
  client: PinataSDK,
  imageBuffer: Buffer,
  metadata: any,
  imageName: string = 'ticket.png'
): Promise<{ imageUrl: string; metadataUrl: string }> {
  console.log('Uploading complete NFT to Pinata...');

  // First upload the image
  const imageUrl = await uploadImageToPinata(client, imageBuffer, imageName);

  // Update metadata with the image URL
  const updatedMetadata = {
    ...metadata,
    image: imageUrl,
    properties: {
      ...metadata.properties,
      files: [
        { uri: imageUrl, type: 'image/png' }
      ]
    }
  };

  // Upload the metadata
  const metadataUrl = await uploadMetadataToPinata(client, updatedMetadata);

  return { imageUrl, metadataUrl };
}


export async function uploadMetadataToPinataPrivate(client: PinataSDK, metadata: any): Promise<{ url: string; cid: string }> {
  console.log('Uploading private metadata to Pinata...');

  try {
    const upload = await client.upload.private.json(metadata);

    const gateway = process.env.PINATA_GATEWAY || "gateway.pinata.cloud";
    const url = `https://${gateway}/ipfs/${upload.cid}`;
    console.log(`Private metadata uploaded to IPFS: ${url}, CID: ${upload.cid}`);
    console.log('Metadata content:', metadata);

    return { url, cid: upload.cid };
  } catch (error) {
    console.error('Failed to upload private metadata to Pinata:', error);
    throw error;
  }
}

export async function createTemporaryImageUrl(client: PinataSDK, cid: string, expiresInSeconds: number = 10): Promise<string> {
  console.log(`Creating temporary URL for image CID: ${cid} (expires in ${expiresInSeconds}s)`);

  const temporaryUrl = await client.gateways.private.createAccessLink({
    cid,
    expires: expiresInSeconds
  });

  console.log(`Temporary URL created: ${temporaryUrl}`);
  return temporaryUrl;
}

export async function createTemporaryMetadataUrl(client: PinataSDK, cid: string, expiresInSeconds: number = 10): Promise<string> {
  console.log(`Creating temporary URL for metadata CID: ${cid} (expires in ${expiresInSeconds}s)`);

  const temporaryUrl = await client.gateways.private.createAccessLink({
    cid,
    expires: expiresInSeconds
  });

  console.log(`Temporary URL created: ${temporaryUrl}`);
  return temporaryUrl;
}

export async function uploadCompleteNFTToPinataWithTemporaryUrls(
  client: PinataSDK,
  imageBuffer: Buffer,
  metadata: any,
  imageName: string = 'ticket.png',
  expiresInSeconds: number = 10
): Promise<{ imageUrl: string; metadataUrl: string; temporaryImageUrl: string; temporaryMetadataUrl: string }> {
  console.log('Uploading complete NFT to Pinata with temporary URLs...');

  // First upload the image as private
  const { url: imageUrl, cid: imageCid } = await uploadImageToPinataPrivate(client, imageBuffer, imageName);

  // Update metadata with the image URL
  const updatedMetadata = {
    ...metadata,
    image: imageUrl,
    properties: {
      ...metadata.properties,
      files: [
        { uri: imageUrl, type: 'image/png' }
      ]
    }
  };

  // Upload the metadata as private
  const { url: metadataUrl, cid: metadataCid } = await uploadMetadataToPinataPrivate(client, updatedMetadata);

  // Create temporary URLs
  const temporaryImageUrl = await createTemporaryImageUrl(client, imageCid, expiresInSeconds);
  const temporaryMetadataUrl = await createTemporaryMetadataUrl(client, metadataCid, expiresInSeconds);

  return {
    imageUrl,
    metadataUrl,
    temporaryImageUrl,
    temporaryMetadataUrl
  };
}