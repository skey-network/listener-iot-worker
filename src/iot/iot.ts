import fetch, { Headers } from 'node-fetch'
import { SpanWrapper } from '../tracing'

type ActionParams = {
  device?: string
  action?: string
  key?: string
  func?: string
  deviceModel?: string
}

type IotMakeActionFnType = (params: ActionParams, span?: SpanWrapper) => void

abstract class IoT {
  abstract makeAction(params: ActionParams, span?: SpanWrapper): void

  protected placeValues(str: string, params: ActionParams, startDate: number = 0) {
    return str
      .replace('{device_address}', params.device || 'undefined')
      .replace('{action_name}', params.action || 'undefined')
      .replace('{function_name}', params.func || 'undefined')
      .replace('{key_id}', params.key || 'undefined')
      .replace('{device_model}', params.deviceModel || 'undefined')
  }

  protected async makeRequest(
    url: string,
    headers: Headers,
    body: string,
    method: string,
    retry: number = 0,
    span?: SpanWrapper
  ) {
    if (process.env.DEBUG) console.log({ url, headers, body, method, retry })
    try {
      span?.event('Iot request')
      const resp = await fetch(url, {
        headers: headers as Headers,
        body: body,
        method: method
      })
      span?.endWithSuccess()
    } catch (error) {
      if (retry > 0) {
        await this.makeRequest(url, headers, body, method, retry - 1, span)
      } else {
        span?.endWithError('Iot request failed')
        console.log('Iot request failed')
        console.log(error)
      }
    }
  }
}

export { IoT, ActionParams, IotMakeActionFnType }
