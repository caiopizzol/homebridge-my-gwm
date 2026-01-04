# Homebridge GWM Vehicle

[![npm](https://img.shields.io/npm/v/homebridge-my-gwm)](https://www.npmjs.com/package/homebridge-my-gwm)
[![homebridge](https://img.shields.io/badge/homebridge-%5E1.8.0-purple)](https://homebridge.io)

Control your GWM vehicle (Haval, Ora, Tank) from Apple HomeKit.

## Features

### Controls

| Accessory | HomeKit Service | Actions |
|-----------|-----------------|---------|
| Door Lock | Lock Mechanism | Lock / Unlock |
| Trunk | Lock Mechanism | Open / Close |
| A/C | Heater Cooler | On / Off with temperature |

### Sensors

| Accessory | HomeKit Service | Data |
|-----------|-----------------|------|
| Battery | Humidity Sensor | Battery SOC (%) |
| 12V Battery | Humidity Sensor | Auxiliary battery (%) |
| EV Range | Light Sensor | Electric range (km) |
| Gas Range | Light Sensor | Fuel range (km) |
| Odometer | Light Sensor | Total mileage (km) |
| Charging Status | Contact Sensor | Charging / Not charging |
| Charger Connected | Contact Sensor | Plugged in / Unplugged |
| Windows (x4) | Contact Sensor | Open / Closed |
| Sunroof | Contact Sensor | Open / Closed |
| Tire Pressure (x4) | Light Sensor | Pressure (kPa) |
| Tire Temperature (x4) | Temperature Sensor | Temperature (°C) |

**Total: 23 accessories**

## Installation

```bash
npm install homebridge-my-gwm
```

Or search for "GWM" in the Homebridge UI.

## Configuration

Add to your Homebridge `config.json`:

```json
{
  "platforms": [
    {
      "platform": "GWMVehicle",
      "name": "GWM Vehicle",
      "username": "your-gwm-email",
      "password": "your-gwm-password",
      "vin": "your-vehicle-vin",
      "pin": "your-remote-command-pin",
      "refreshInterval": 60
    }
  ]
}
```

### Configuration Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `platform` | Yes | - | Must be `GWMVehicle` |
| `name` | No | `GWM Vehicle` | Platform name |
| `username` | Yes | - | Your GWM account email |
| `password` | Yes | - | Your GWM account password |
| `vin` | Yes | - | Vehicle Identification Number |
| `pin` | Yes | - | Remote command PIN (from My GWM app) |
| `refreshInterval` | No | `60` | Status polling interval in seconds (min: 30) |
| `tirePressureUnit` | No | `psi` | Tire pressure unit: `psi`, `kPa`, or `bar` |

## Usage

Once configured, you can:

- **"Hey Siri, lock my car"** - Lock the doors
- **"Hey Siri, unlock my car"** - Unlock the doors
- **"Hey Siri, turn on the A/C"** - Start climate control
- **View battery level** and **EV/Gas range** in the Home app
- **Monitor tire pressure and temperature** for all 4 tires
- **Check charging status** and charger connection
- **Create automations** based on vehicle state (e.g., notify when charging completes)

## Supported Regions

Currently supports **Brazil** only (GWM Brazil API).

## Rate Limiting

The GWM API enforces a 60-second cooldown between commands. If you send commands too quickly, you'll receive an error message indicating the wait time.

## Troubleshooting

### Authentication Failed
- Verify your email and password are correct
- Ensure you can log into the My GWM app

### Commands Not Working
- Verify your PIN is correct (same as the My GWM app)
- Wait 60 seconds between commands
- Check that your vehicle has cellular connectivity

### Accessories Not Appearing
- Restart Homebridge after configuration changes
- Check the Homebridge logs for errors

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm run build

# Watch mode
pnpm run watch

# Link for local testing
pnpm link --global
```

## Credits

Based on the work from [hassio-haval-h6-to-mqtt](https://github.com/havaleiros/hassio-haval-h6-to-mqtt) for Home Assistant.

## License

MIT
