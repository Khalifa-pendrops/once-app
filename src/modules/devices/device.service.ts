import { DeviceRepository } from "./device.repository";

export class DeviceService {
  private readonly repo = new DeviceRepository();

  /**
   * Ensures a device belongs to the user and is not revoked.
   */
  async validateDevice(userId: string, deviceId: string): Promise<void> {
    const device = await this.repo.findById(deviceId);

    if (!device) {
      throw new Error("Device not found");
    }

    if (device.userId !== userId) {
      throw new Error("Device does not belong to this user");
    }

    if (device.revokedAt) {
      throw new Error("Device has been revoked");
    }
  }
}
