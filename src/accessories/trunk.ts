import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge'
import type { GWMPlatform } from '../platform.js'

export class TrunkAccessory {
  private service: Service

  constructor(
    private readonly platform: GWMPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)
      ?.setCharacteristic(this.platform.Characteristic.Manufacturer, 'GWM')
      .setCharacteristic(this.platform.Characteristic.Model, 'Vehicle Trunk')
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        this.platform.config.vin as string,
      )

    this.service =
      this.accessory.getService(this.platform.Service.LockMechanism) ??
      this.accessory.addService(this.platform.Service.LockMechanism)

    this.service.setCharacteristic(this.platform.Characteristic.Name, 'Trunk')

    this.service
      .getCharacteristic(this.platform.Characteristic.LockCurrentState)
      .onGet(this.getTrunkState.bind(this))

    this.service
      .getCharacteristic(this.platform.Characteristic.LockTargetState)
      .onGet(this.getTrunkState.bind(this))
      .onSet(this.setTrunkState.bind(this))
  }

  private getTrunkState(): CharacteristicValue {
    const status = this.platform.getVehicleStatus()
    const isClosed = status?.trunkClosed ?? true

    this.platform.log.debug('Trunk state:', isClosed ? 'SECURED' : 'UNSECURED')

    return isClosed
      ? this.platform.Characteristic.LockCurrentState.SECURED
      : this.platform.Characteristic.LockCurrentState.UNSECURED
  }

  private async setTrunkState(value: CharacteristicValue): Promise<void> {
    const shouldClose = value === this.platform.Characteristic.LockTargetState.SECURED

    this.platform.log.info(`Setting trunk to: ${shouldClose ? 'CLOSED' : 'OPEN'}`)

    const result = await this.platform.client.controlTrunk(shouldClose ? 'CLOSE' : 'OPEN')

    if (!result.result) {
      this.platform.log.error('Failed to control trunk:', result.message)
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      )
    }

    this.service.updateCharacteristic(this.platform.Characteristic.LockCurrentState, value)
  }
}
