import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge'
import type { GWMPlatform } from '../platform.js'

export class DoorLockAccessory {
  private service: Service

  constructor(
    private readonly platform: GWMPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)
      ?.setCharacteristic(this.platform.Characteristic.Manufacturer, 'GWM')
      .setCharacteristic(this.platform.Characteristic.Model, 'Vehicle Door Lock')
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        this.platform.config.vin as string,
      )

    this.service =
      this.accessory.getService(this.platform.Service.LockMechanism) ??
      this.accessory.addService(this.platform.Service.LockMechanism)

    this.service.setCharacteristic(this.platform.Characteristic.Name, 'Door Lock')

    this.service
      .getCharacteristic(this.platform.Characteristic.LockCurrentState)
      .onGet(this.getLockState.bind(this))

    this.service
      .getCharacteristic(this.platform.Characteristic.LockTargetState)
      .onGet(this.getLockState.bind(this))
      .onSet(this.setLockState.bind(this))
  }

  private getLockState(): CharacteristicValue {
    const status = this.platform.getVehicleStatus()
    const isLocked = status?.doorLocked ?? true

    this.platform.log.debug('Door lock state:', isLocked ? 'SECURED' : 'UNSECURED')

    return isLocked
      ? this.platform.Characteristic.LockCurrentState.SECURED
      : this.platform.Characteristic.LockCurrentState.UNSECURED
  }

  private async setLockState(value: CharacteristicValue): Promise<void> {
    const shouldLock = value === this.platform.Characteristic.LockTargetState.SECURED

    this.platform.log.info(`Setting door lock to: ${shouldLock ? 'LOCKED' : 'UNLOCKED'}`)

    const result = await this.platform.client.controlDoors(shouldLock ? 'CLOSE' : 'OPEN')

    if (!result.result) {
      this.platform.log.error('Failed to control doors:', result.message)
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      )
    }

    this.service.updateCharacteristic(this.platform.Characteristic.LockCurrentState, value)
  }
}
