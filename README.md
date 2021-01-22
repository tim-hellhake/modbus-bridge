# Modbus bridge

[![Build Status](https://github.com/tim-hellhake/modbus-bridge/workflows/Build/badge.svg)](https://github.com/tim-hellhake/modbus-bridge/actions?query=workflow%3ABuild)
[![dependencies](https://david-dm.org/tim-hellhake/modbus-bridge.svg)](https://david-dm.org/tim-hellhake/modbus-bridge)
[![devDependencies](https://david-dm.org/tim-hellhake/modbus-bridge/dev-status.svg)](https://david-dm.org/tim-hellhake/modbus-bridge?type=dev)
[![optionalDependencies](https://david-dm.org/tim-hellhake/modbus-bridge/optional-status.svg)](https://david-dm.org/tim-hellhake/modbus-bridge?type=optional)
[![license](https://img.shields.io/badge/license-MPL--2.0-blue.svg)](LICENSE)

This bridge starts a modbus tcp server which can be accessed by modbus clients.

# How to use
* Go to `settings/developer` and click `Create local authorization`
* Create a new token and copy it
* Go to the settings of the modbus bridge and insert the copied token
* After the start the adapter will map the device ids to unitIDs and the property names to register addresses
* Go to the settings again, check the unitID/register addresses you are interested in and add them to your modbus client

# Limitations
* Only 1 bit and 16 bit integer registers are supported
* The registers are read-only at the moment
