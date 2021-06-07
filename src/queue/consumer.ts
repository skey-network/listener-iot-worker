import { ActionParams } from '../iot/iot'
import RedisSMQ from 'rsmq'

class Consumer {
  rsmq: RedisSMQ
  consumer: (params: ActionParams) => void

  constructor(consumer: (params: ActionParams) => void) {
    this.rsmq = new RedisSMQ({ host: '127.0.0.1', port: 6379, ns: 'all-txes' })
    this.consumer = consumer
    const that = this
    try {
      // Create queue if not exists, if created successfully or already exists, sets consumer for message
      this.rsmq.createQueue({ qname: 'all-txes' }, function (err: Error, resp) {
        if (err) {
          if (err.message == 'Queue exists') {
            that.setConsumer()
            return
          }
          console.error(err)
          process.exit(1) // exit with error
        }

        if (resp === 1) {
          console.log('queue created')
          that.setConsumer()
        }
      })
    } catch {}
  }

  /** Sets consumer for next message */
  protected setConsumer() {
    this.rsmq.popMessage({ qname: 'all-txes' }, (err, resp) =>
      this.messageCallback(err, resp)
    )
  }

  /** Callback for message, calls consumer callback, sets consumer for new message */
  protected messageCallback(err: Error, resp: RedisSMQ.QueueMessage | {}) {
    if (err) {
      console.log(err)
      return
    }
    try {
      const response = resp as RedisSMQ.QueueMessage
      if (response.id) {
        const payload = JSON.parse(response.message) as ActionParams
        this.consumer(payload)
      }
    } catch {
      // log somewhere about error?
    }
    this.setConsumer() // take new message
  }
}

export default Consumer
