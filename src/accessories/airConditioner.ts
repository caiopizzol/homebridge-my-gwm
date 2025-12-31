import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge'
import type { GWMPlatform } from '../platform.js'

export class AirConditionerAccessory {
  private service: Service
  private targetTemperature: number

  constructor(
    private readonly platform: GWMPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.targetTemperature = this.platform.getACTemperature()

    this.accessory
      .getService(this.platform.Service.AccessoryInformation)
      ?.setCharacteristic(this.platform.Characteristic.Manufacturer, 'GWM')
      .setCharacteristic(this.platform.Characteristic.Model, 'Vehicle A/C')
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        this.platform.config.vin as string,
      )

    this.service =
      this.accessory.getService(this.platform.Service.HeaterCooler) ??
      this.accessory.addService(this.platform.Service.HeaterCooler)

    this.service.setCharacteristic(this.platform.Characteristic.Name, 'A/C')

    // Active (on/off)
    this.service
      .getCharacteristic(this.platform.Characteristic.Active)
      .onGet(this.getActive.bind(this))
      .onSet(this.setActive.bind(this))

    // Current state (read-only)
    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState)
      .onGet(this.getCurrentState.bind(this))

    // Target state - lock to COOL only for car A/C
    this.service
      .getCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState)
      .setProps({
        validValues: [this.platform.Characteristic.TargetHeaterCoolerState.COOL],
      })
      .onGet(() => this.platform.Characteristic.TargetHeaterCoolerState.COOL)
      .onSet(() => {}) // Ignore attempts to change

    // Current temperature (we don't have a sensor, use target as placeholder)
    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(() => this.targetTemperature)

    // Cooling threshold temperature (the temp we send to the car)
    this.service
      .getCharacteristic(this.platform.Characteristic.CoolingThresholdTemperature)
      .setProps({
        minValue: 16,
        maxValue: 30,
        minStep: 1,
      })
      .onGet(() => this.targetTemperature)
      .onSet(this.setTargetTemperature.bind(this))
  }

  private getActive(): CharacteristicValue {
    const status = this.platform.getVehicleStatus()
    const isActive = status?.acOn ?? false
    return isActive
      ? this.platform.Characteristic.Active.ACTIVE
      : this.platform.Characteristic.Active.INACTIVE
  }

  private getCurrentState(): CharacteristicValue {
    const status = this.platform.getVehicleStatus()
    const isOn = status?.acOn ?? false

    if (isOn) {
      return this.platform.Characteristic.CurrentHeaterCoolerState.COOLING
    }
    return this.platform.Characteristic.CurrentHeaterCoolerState.INACTIVE
  }

  private async setActive(value: CharacteristicValue): Promise<void> {
    const shouldActivate = value === this.platform.Characteristic.Active.ACTIVE
    const duration = this.platform.getACDuration()

    this.platform.log.info(
      `Setting A/C to: ${shouldActivate ? 'ON' : 'OFF'} at ${this.targetTemperature}°C for ${duration} min`,
    )

    const result = await this.platform.client.controlAC(
      shouldActivate ? 'ON' : 'OFF',
      this.targetTemperature,
      duration,
    )

    if (!result.result) {
      this.platform.log.error('Failed to control A/C:', result.message)
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      )
    }
  }

  private async setTargetTemperature(value: CharacteristicValue): Promise<void> {
    this.targetTemperature = value as number
    this.platform.log.info(`A/C target temperature set to: ${this.targetTemperature}°C`)

    // Update CurrentTemperature to match (since we use target as placeholder)
    this.service.updateCharacteristic(
      this.platform.Characteristic.CurrentTemperature,
      this.targetTemperature,
    )
  }
}
