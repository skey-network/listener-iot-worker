import { Headers } from 'node-fetch'
import { SpanWrapper } from '../tracing'
import { IoT, ActionParams } from './iot'

type PerDeviceOptions = {
  /** list of supported actions or empty to allow all */
  supportedActions?: string[]
  /** Device's blockchain address */
  devices: string[]
  /** json to use for device action */
  json?: string
  /** overrides json for selected device by action */
  jsonByAction?: { action: string; json: string }[]
}

type StdIoTOptions = {
  /** If specified tells how many times action will be attempted in case of ito failure */
  maxRetry?: number
  /** Api key of iot server */
  XApiKey?: string
  /** Url to iot server */
  url: string
  /** Method used for requests to iot */
  method: string
  /** per device json, if specified overrides global/per action json */
  perDevice?: PerDeviceOptions[]
  /** json to use in case there is no device model or device is not in list of supported */
  fallbackJson?: string
}

class StdIoT extends IoT {
  options: StdIoTOptions
  constructor(options: StdIoTOptions) {
    super()
    this.options = options
    if (process.env.DEBUG)
      console.log({ ...this.options, ...{ XApiKey: '========SECRET========' } })
  }

  async makeAction(params: ActionParams, span?: SpanWrapper) {
    const fallbackDisabled = !this.options.fallbackJson

    if (!params.device) {
      // no device, shouldnt happen
      if (process.env.DEBUG) console.log('Unknown device model')
      return span?.endWithError('Unknown device model')
    }

    if (!params.deviceModel) {
      if (process.env.DEBUG) console.log('Unknown device model')

      if (fallbackDisabled) return span?.endWithError('Unknown device model')
    }
    const devOptions: PerDeviceOptions | undefined = this.getDeviceOptions(
      params.deviceModel!
    )

    if (!devOptions && fallbackDisabled) {
      if (process.env.DEBUG) console.log(`Device not supported ${params.deviceModel}`)
      return span?.endWithError('Device not supported')
    }
    if (fallbackDisabled && this.isActionUnsupported(devOptions!, params.action!)) {
      if (process.env.DEBUG)
        console.log(`Action ${params.action} unsupported for ${params.deviceModel}`)
      return span?.endWithError('Action unsupported for this device')
    }
    const actionOptions = this.options //this.getActionOptions(params.action!)

    let bodyJson = devOptions
      ? this.getJson(devOptions, params.action!)
      : this.options.fallbackJson
    bodyJson = this.placeValues(bodyJson || '', params)
    const url = this.placeValues(actionOptions.url, params)

    this.makeRequest(
      url,
      this.createHeaders(actionOptions, bodyJson),
      bodyJson,
      actionOptions.method || 'POST',
      actionOptions.maxRetry || 0,
      span
    )
  }

  getDeviceOptions(model: string) {
    return this.options.perDevice?.find((x) => x.devices.indexOf(model) >= 0)
  }

  isActionUnsupported(deviceOptions: PerDeviceOptions, action: string) {
    if (deviceOptions.supportedActions!.indexOf(action) >= 0) return false
    return true
  }

  getJson(deviceOptions: PerDeviceOptions, action: string): string | undefined {
    return (
      deviceOptions?.jsonByAction?.find((x) => x.action === action)?.json ??
      deviceOptions?.json
    )
  }

  createHeaders(actionOptions: StdIoTOptions, bodyJson: string) {
    const headers = new Headers()
    if (bodyJson.length > 0) {
      headers.append('Content-Type', 'application/json')
    }

    if (actionOptions.XApiKey) {
      headers.append('X-API-KEY', actionOptions.XApiKey)
    }
    return headers
  }
}

export { StdIoT, PerDeviceOptions }
