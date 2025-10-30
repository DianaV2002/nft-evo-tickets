"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPinataClient = getPinataClient;
exports.uploadImageToPinata = uploadImageToPinata;
exports.uploadImageToPinataPrivate = uploadImageToPinataPrivate;
exports.uploadMetadataToPinata = uploadMetadataToPinata;
exports.uploadCompleteNFTToPinata = uploadCompleteNFTToPinata;
exports.uploadMetadataToPinataPrivate = uploadMetadataToPinataPrivate;
exports.createTemporaryImageUrl = createTemporaryImageUrl;
exports.createTemporaryMetadataUrl = createTemporaryMetadataUrl;
exports.uploadCompleteNFTToPinataWithTemporaryUrls = uploadCompleteNFTToPinataWithTemporaryUrls;
const pinata_1 = require("pinata");
function getPinataClient(jwt, gateway) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!jwt || jwt === 'undefined' || jwt === '[NOT SET]') {
            throw new Error('PINATA_JWT is required. Get one from https://pinata.cloud');
        }
        if (!jwt.startsWith('eyJ')) {
            throw new Error('Invalid Pinata JWT format. Should start with "eyJ". Get a valid JWT from https://pinata.cloud');
        }
        const pinata = new pinata_1.PinataSDK({
            pinataJwt: jwt,
            pinataGateway: gateway || "gateway.pinata.cloud"
        });
        return pinata;
    });
}
function uploadImageToPinata(client_1, imageBuffer_1) {
    return __awaiter(this, arguments, void 0, function* (client, imageBuffer, filename = 'ticket.png') {
        console.log(`Uploading image to Pinata (${imageBuffer.length} bytes)...`);
        try {
            const file = new File([imageBuffer], filename, { type: 'image/png' });
            const upload = yield client.upload.public.file(file);
            const gateway = process.env.PINATA_GATEWAY || "gateway.pinata.cloud";
            const url = `https://${gateway}/ipfs/${upload.cid}`;
            console.log(`Image uploaded to IPFS: ${url}`);
            return url;
        }
        catch (error) {
            console.error('Failed to upload image to Pinata:', error);
            throw error;
        }
    });
}
function uploadImageToPinataPrivate(client_1, imageBuffer_1) {
    return __awaiter(this, arguments, void 0, function* (client, imageBuffer, filename = 'ticket.png') {
        console.log(`Uploading private image to Pinata (${imageBuffer.length} bytes)...`);
        try {
            const file = new File([imageBuffer], filename, { type: 'image/png' });
            const upload = yield client.upload.private.file(file);
            const gateway = process.env.PINATA_GATEWAY || "gateway.pinata.cloud";
            const url = `https://${gateway}/ipfs/${upload.cid}`;
            console.log(`Private image uploaded to IPFS: ${url}, CID: ${upload.cid}`);
            return { url, cid: upload.cid };
        }
        catch (error) {
            console.error('Failed to upload private image to Pinata:', error);
            throw error;
        }
    });
}
function uploadMetadataToPinata(client, metadata) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Uploading metadata to Pinata...');
        try {
            const upload = yield client.upload.public.json(metadata);
            const gateway = process.env.PINATA_GATEWAY || "gateway.pinata.cloud";
            const url = `https://${gateway}/ipfs/${upload.cid}`;
            console.log(`Metadata uploaded to IPFS: ${url}`);
            console.log('Metadata content:', metadata);
            return url;
        }
        catch (error) {
            console.error('Failed to upload metadata to Pinata:', error);
            throw error;
        }
    });
}
function uploadCompleteNFTToPinata(client_1, imageBuffer_1, metadata_1) {
    return __awaiter(this, arguments, void 0, function* (client, imageBuffer, metadata, imageName = 'ticket.png') {
        console.log('Uploading complete NFT to Pinata...');
        // First upload the image
        const imageUrl = yield uploadImageToPinata(client, imageBuffer, imageName);
        // Update metadata with the image URL
        const updatedMetadata = Object.assign(Object.assign({}, metadata), { image: imageUrl, properties: Object.assign(Object.assign({}, metadata.properties), { files: [
                    { uri: imageUrl, type: 'image/png' }
                ] }) });
        // Upload the metadata
        const metadataUrl = yield uploadMetadataToPinata(client, updatedMetadata);
        return { imageUrl, metadataUrl };
    });
}
function uploadMetadataToPinataPrivate(client, metadata) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Uploading private metadata to Pinata...');
        try {
            const upload = yield client.upload.private.json(metadata);
            const gateway = process.env.PINATA_GATEWAY || "gateway.pinata.cloud";
            const url = `https://${gateway}/ipfs/${upload.cid}`;
            console.log(`Private metadata uploaded to IPFS: ${url}, CID: ${upload.cid}`);
            console.log('Metadata content:', metadata);
            return { url, cid: upload.cid };
        }
        catch (error) {
            console.error('Failed to upload private metadata to Pinata:', error);
            throw error;
        }
    });
}
function createTemporaryImageUrl(client_1, cid_1) {
    return __awaiter(this, arguments, void 0, function* (client, cid, expiresInSeconds = 10) {
        console.log(`Creating temporary URL for image CID: ${cid} (expires in ${expiresInSeconds}s)`);
        const temporaryUrl = yield client.gateways.private.createAccessLink({
            cid,
            expires: expiresInSeconds
        });
        console.log(`Temporary URL created: ${temporaryUrl}`);
        return temporaryUrl;
    });
}
function createTemporaryMetadataUrl(client_1, cid_1) {
    return __awaiter(this, arguments, void 0, function* (client, cid, expiresInSeconds = 10) {
        console.log(`Creating temporary URL for metadata CID: ${cid} (expires in ${expiresInSeconds}s)`);
        const temporaryUrl = yield client.gateways.private.createAccessLink({
            cid,
            expires: expiresInSeconds
        });
        console.log(`Temporary URL created: ${temporaryUrl}`);
        return temporaryUrl;
    });
}
function uploadCompleteNFTToPinataWithTemporaryUrls(client_1, imageBuffer_1, metadata_1) {
    return __awaiter(this, arguments, void 0, function* (client, imageBuffer, metadata, imageName = 'ticket.png', expiresInSeconds = 10) {
        console.log('Uploading complete NFT to Pinata with temporary URLs...');
        // First upload the image as private
        const { url: imageUrl, cid: imageCid } = yield uploadImageToPinataPrivate(client, imageBuffer, imageName);
        // Update metadata with the image URL
        const updatedMetadata = Object.assign(Object.assign({}, metadata), { image: imageUrl, properties: Object.assign(Object.assign({}, metadata.properties), { files: [
                    { uri: imageUrl, type: 'image/png' }
                ] }) });
        // Upload the metadata as private
        const { url: metadataUrl, cid: metadataCid } = yield uploadMetadataToPinataPrivate(client, updatedMetadata);
        // Create temporary URLs
        const temporaryImageUrl = yield createTemporaryImageUrl(client, imageCid, expiresInSeconds);
        const temporaryMetadataUrl = yield createTemporaryMetadataUrl(client, metadataCid, expiresInSeconds);
        return {
            imageUrl,
            metadataUrl,
            temporaryImageUrl,
            temporaryMetadataUrl
        };
    });
}
