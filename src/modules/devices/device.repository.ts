import { prisma } from "../../database/prisma";
import type { Device } from "@prisma/client";

export type createDeviceInput = Readonly<{
    userId: string;
    deviceName: string;
}>;

export class DeviceRepository {
    // find device by deviceToken
    // async findByDeviceToken(deviceName: string): Promise<Device | null> {
    //     return prisma.device.findUnique({ where: { deviceName } });
    // }

    // create device
    async create(data: createDeviceInput): Promise<Device> {
        return prisma.device.create({
            data: {
                userId: data.userId,
                deviceName: data.deviceName
            }
        });
    }
}
