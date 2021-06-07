#!/usr/bin/node
import dotenv from 'dotenv'
import fetch, { Headers } from 'node-fetch'
import { exit } from 'process'
import http from 'http'
import { StdIoT } from './iot/std_iot'
import { ActionParams } from './iot/iot'
import YargsParser from 'yargs-parser'
import fs from 'fs'
import Consumer from './queue/consumer'

///////////////////////////////////// check for env /////////////////////////////
const args = YargsParser(process.argv.slice(2))
let PerDeviceConfig

let denvResult
if (args['env-file']) {
  denvResult = dotenv.config({ path: args['env-file'] })
} else {
  dotenv.config()
}

try {
  PerDeviceConfig = JSON.parse(
    fs.readFileSync(args['config-file'] ?? './config.json').toString()
  )
} catch (ex) {
  console.log(ex.code)
  if (ex.code == 'ENOENT') {
    console.log('Per device confuguration file (config.json) not found. Ignoring')
  } else {
    console.log('Per device confuguration file (config.json) broken or inaccessible')
    exit()
  }
  PerDeviceConfig = []
}

if (process.env.IOT_PLATFORM_URL == undefined) {
  console.log(
    'Env file not found or empty, specify --env-file=path_to_file, or provide required variables via docker env'
  )
  exit()
}

////////////////////////////////////// dummy server, in case docker hosting requires one in container ////////////////////////////////

if (process.env.PORT) {
  const startServer = () => {
    http
      .createServer((req, res) => {
        res.statusCode = 204
        res.end()
      })
      .listen(Number(process.env.PORT))
      .on('listening', () => console.log(`Dummy server started at ${process.env.PORT}`))
  }
  startServer()
}

////////////////////////////////////// main app /////////////////////////////////
console.log('Starting')

const DEBUG = process.env.DEBUG == 'true'

const iot = new StdIoT({
  url: process.env.IOT_PLATFORM_URL as string,
  XApiKey: process.env.IOT_PLATFORM_TOKEN as string,
  method: process.env.IOT_METHOD!,
  perDevice: PerDeviceConfig,
  fallbackJson: process.env.IOT_FALLBACK_JSON
})

const consumer = new Consumer((params: ActionParams) => {
  iot.makeAction(params)
})
