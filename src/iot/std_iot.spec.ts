import http, { IncomingMessage, RequestListener } from 'http'
import { StdIoT, PerDeviceOptions } from './std_iot'
import { ActionParams } from './iot'

class SpanMock {
  endWithError(message: string) {
    context.events.push(message)
  }
  endWithSuccess(message?: string) {
    context.events.push(message ?? 'success')
  }
  event(message: string) {
    context.events.push(message)
  }
}

const context: {
  requests: { url: string; body: string }[]
  events: string[]
  port: number
  delay: any
  spanMock: any
  iotBuilder: any
} = {
  requests: [],
  events: [],
  port: 12345,
  delay: (time: number) => {
    return new Promise((resolve) => setTimeout(resolve, time))
  },
  spanMock: new SpanMock(),
  iotBuilder: (config: PerDeviceOptions[], fallback = false) => {
    return new StdIoT({
      url: `http://localhost:${context.port}/{device_model}`,
      XApiKey: 'apikey',
      method: 'post',
      perDevice: config,
      fallbackJson: fallback
        ? '{"rule":"fallback", "device_address":"{device_address}", "action_name":"{action_name}", "key_id":"{key_id}", "function_name":"{function_name}", "device_model":"{device_model}"}'
        : undefined
    })
  }
}

const testIotServer = http.createServer(function (req: IncomingMessage, res: any) {
  let data = ''
  req.on('data', (chunk: any) => {
    data += chunk
  })
  req.on('end', () => {
    res.end()

    context.requests.push({ url: req.url! || '', body: data })
  })
})

const stdConfig: PerDeviceOptions[] = [
  {
    supportedActions: ['close', 'open'],
    devices: ['anyDev', 'testDev'],
    json: '{"rule":"dev", "device_address":"{device_address}", "action_name":"{action_name}", "key_id":"{key_id}", "function_name":"{function_name}", "device_model":"{device_model}"}',
    jsonByAction: [
      {
        action: 'close',
        json: '{"rule":"dev-close", "device_address":"{device_address}", "action_name":"{action_name}", "key_id":"{key_id}", "function_name":"{function_name}", "device_model":"{device_model}"}'
      }
    ]
  }
]

type ExpectedResult = {
  fail?: boolean
  requestBody?: string
  requestBodyFallback?: string
  requestUrl?: string
  events?: string[]
}

/**
 *
 *  CASES
 *
 */
const cases: [ActionParams, ExpectedResult][] = [
  [
    // no args, should fail, no fallback possible
    {},
    { fail: true }
  ],
  [
    // ok, by device
    {
      device: 'device',
      action: 'open',
      deviceModel: 'testDev',
      func: 'func',
      key: 'key'
    },
    {
      requestBody:
        '{"rule":"dev", "device_address":"device", "action_name":"open", "key_id":"key", "function_name":"func", "device_model":"testDev"}',
      requestUrl: '/testDev',
      events: ['Iot request', 'success']
    }
  ],
  [
    // ok by device action
    {
      device: 'device',
      action: 'close',
      deviceModel: 'testDev',
      func: 'func',
      key: 'key'
    },
    {
      requestBody:
        '{"rule":"dev-close", "device_address":"device", "action_name":"close", "key_id":"key", "function_name":"func", "device_model":"testDev"}',
      requestUrl: '/testDev',
      events: ['Iot request', 'success']
    }
  ],
  [
    // fail, with fallback possible
    {
      device: 'device',
      action: 'open',
      deviceModel: 'testDevNotListed',
      func: 'func',
      key: 'key'
    },
    {
      fail: true,
      requestBodyFallback:
        '{"rule":"fallback", "device_address":"device", "action_name":"open", "key_id":"key", "function_name":"func", "device_model":"testDevNotListed"}'
    }
  ]
]

/**
 *
 *  TEST
 *
 */
describe('StdIot', () => {
  beforeAll(async (done) => {
    testIotServer.listen(context.port, function () {
      console.log(`server started at port ${context.port}`)
    })
    testIotServer.on('listening', done)
  })
  afterAll(async () => {
    testIotServer.close()
  })
  beforeEach(() => {
    context.requests = []
    context.events = []
  })

  describe('No fallback', () => {
    test.each(cases)(
      'Listener test %p %p',
      async (params: ActionParams, expected: ExpectedResult) => {
        const iot = context.iotBuilder(stdConfig)
        iot.makeAction(params, context.spanMock)
        await context.delay(200)
        if (expected.fail) {
          expect(context.requests.length).toBe(0)
        } else {
          expect(context.requests.length).toBe(1)
          expect(context.requests[0].body).toBe(expected.requestBody)
          expect(context.requests[0].url).toBe(expected.requestUrl)
          expect(context.events.sort()).toStrictEqual(expected.events?.sort())
        }
      }
    )
  })

  describe('Fallback', () => {
    test.each(cases)(
      'Listener test %p %p',
      async (params: ActionParams, expected: ExpectedResult) => {
        const iot = context.iotBuilder(stdConfig, true)
        iot.makeAction(params, context.spanMock)
        await context.delay(200)
        if (expected.fail) {
          if (expected.requestBodyFallback) {
            expect(context.requests.length).toBe(1)
            expect(context.requests[0].body).toBe(expected.requestBodyFallback)
          } else {
            console.log(context.requests)
            expect(context.requests.length).toBe(0)
          }
        } else {
          expect(context.requests.length).toBe(1)
          expect(context.requests[0].body).toBe(expected.requestBody)
          expect(context.requests[0].url).toBe(expected.requestUrl)
          expect(context.events.sort()).toStrictEqual(expected.events?.sort())
        }
      }
    )
  })
})
