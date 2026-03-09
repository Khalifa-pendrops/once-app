import { prisma } from "../../database/prisma";
// import type { PublicKey } from "@prisma/client";

export type createPublicKeyInput = Readonly<{
    deviceId: string;
    keyType: string;
    publicKey: string;
}>;

export class PublicKeyRepository {
    // find public key by deviceId
    // async findByDeviceId(deviceId: string): Promise<PublicKey | null> {
    //     return prisma.publicKey.findUnique({ where: { deviceId } });
    // }

    async create(data: createPublicKeyInput): Promise<any> {
        return prisma.publicKey.create({
            data: {
                deviceId: data.deviceId,
                keyType: data.keyType,
                publicKey: data.publicKey
            }
        });
    }
    
}