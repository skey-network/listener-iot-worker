# Running from sources

Required packages: `nodejs`, `npm` (prefered instalation via `nvm`)

1. Clone repository
2. Navigate to supplier-oracle folder
3. Install dependencies `npm install`
4. Copy `.env.example` as `.env`, and modify it's contents as in [Configuration file section](#configuration-file).
5. Copy device config `config.json.example` as `config.json`m and modify it's contents as in [Devices onfiguration file section](#devices-configuration-file).
6. Run command `npm start`

<!-- # Building deb package

Required packages: `nodejs`, `npm`, `jq`, `dpkg`, `fakeroot`

1. Follow steps 1-4 from section [Running from sources](#running-from-sources)
2. Create `.deb_env` if you want to include default configuration (Optional)
3. Execute `npm run debify` (without default config) or `npm run debifyenv` (with default config)

Generated package should be named like `supplier-oracle_xxxx.deb`

# Instalation from .deb package

Instal package `supplier-oracle_xxxx.deb` by double click or from console, eg:

`sudo apt install ./supplier-oracle_1.0.0-alpha_all.deb`

# Running oracle from .deb package

## With default configuration file

Execute command in terminal

    supplier-oracle

## Using alternative configuration file

Execute command in terminal providing path to custom configuration

    # supplier-oracle config-file=PATH_TO_CONFIG_FILE
    # eg:
    supplier-oracle config-file=~/Desktop/oracle_configuration/.env -->

# Building and running docker image

## Build

Execute command in project directory:

```
docker build .
```

Result should look like:

```
(...)
Successfully built IMAGE_ID
```

## Run

To run image execute (config.json and docker env as file or params are required):

```
docker run -i -v `pwd`/.config.json:/app/config.json <place docker envs here> IMAGE_ID
```

When config.json file is in another location, provide absolute path to it on left side of "`:`" (instead of `` `pwd`/config.json``, where pwd returns actual working directory, eg `/user/home/xyz/listener/config.json`)

If there is no env specified oracle will stop execution.

## Build and run

All in one command which will build image and run it (ensure that path to config is correct)

```
docker run -i -v `pwd`/config.json:/app/config.json <place docker envs here> `docker build -q .`
```

# Configuration file

<!-- - Deb package - default configuration should be placed in 'usr/share/supplier-oracle/app/.env' (if was specified when making package)<br>
  Administrator privileges are required to create/modify this file, however you can specify alternative configuration file location as [parameter](#using-alternative-configuration-file). -->

- Running from sources - it will expect .env & config.json in project folder
- Running in docker container - path config.json file should be provided as described in [this section](Building-and-running-docker-image), including rest of env specified as docker env file or parameters

## BLOCKCHAIN

DApp monitored for open requests

```
DAPP='3NBPqqjDH2eYmoHeXNPnHhLvA7D4UDQXQcx'
```

Functions called in dApp in order to open a device (separated by "|")

```
DAPP_FUNCS='deviceAction|deviceActionAs'
```

<!-- Argument specifying action 'open'

```
DAPP_ARG='open'
``` -->

Url to node used for monitoring state of dApp

```
NODE_URL='https://nodes-testnet.wavesnodes.com'

```

### Options for HTTP mode

Number of blocks over parsed one, higher values are safer but slower.

```
SAFETY_LEVEL=0
```

Interval of checking for new transactions

```
CHECK_INTERVAL=1000
```

### Options for GRPC mode

Blockchain updates extension port

```
NODE_GRPC_EVENTS='localhost:6881'
```

Grpc extension port

```
NODE_GRPC='10.0.0.7:6877'
```

## IOT

Token for iot

```
IOT_PLATFORM_TOKEN='abcdef...'
```

Url for sending command to devices, where eg. `{device_address}` will be replaced with device's blochchain address (more variables are available as specified below)

```
IOT_PLATFORM_URL='http://localhost:3000/{device_address}/commands'
```

<!-- JSON payload for device command

```
OPEN_JSON='{"action","{action_name}"}'
``` -->

Method used for requests

```
IOT_METHOD='POST'
```

### Variables available for url/json

- device_address - blockchain address of device
- action_name - name of requested action (command)
- key_id - id of key asset
- function_name - name of used function
- device_model - type of device

## Debug info

Enables debug messages, COMMENT OUT do DISABLE

```
DEBUG=true
```

# Devices configuration file

Devices configuration is defined in `config.json` in JSON format (remove comments before use).

- `"devices"` - array of supported devices
- `"supportedAction"` - array of supported action for device
- `"json"` - json for request
- `"jsonByAction"` - request json can be dependent on action
  - `"action"` - action to override json
  - `"json"` - json to be used instead

```json
[
  {
    "devices": ["fmb920", "fmb900"],
    "supportedActions": ["open"],
    "json": "{\"command\": \"login passw setdigout 1? 1\"}"
  },
  {
    "devices": ["anyDev", "testDev"],
    "supportedActions": ["close", "open"],
    "json": "{...}",
    "jsonByAction": [{ "action": "close", "json": "testdev close json" }]
  }
]
```
