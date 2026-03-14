import EventEmitter from 'eventemitter3'
import { SetRequired } from 'type-fest'

export interface Config {
    bufferLength?: number
    retryInterval?: number
}

export class StreamReader<T> {
    protected EE = new EventEmitter()

    protected config: SetRequired<Config, 'bufferLength' | 'retryInterval'>

    protected innerBuffer: T[] = []

    protected url = ''

    protected connection: WebSocket | null = null

    protected sessionId = 0

    protected retryCount = 0

    protected readonly maxRetryInterval = 30000

    constructor (config: Config) {
        this.config = Object.assign(
            {
                bufferLength: 0,
                retryInterval: 3000,
            },
            config,
        )
    }

    protected connectWebsocket (session: number) {
        if (session !== this.sessionId) return

        const url = new URL(this.url)
        this.connection = new WebSocket(url.toString())

        this.connection.addEventListener('open', () => {
            this.retryCount = 0
        })

        this.connection.addEventListener('message', msg => {
            if (session !== this.sessionId) return
            const data = JSON.parse(msg.data)
            this.EE.emit('data', [data])
            if (this.config.bufferLength > 0) {
                this.innerBuffer.push(data)
                if (this.innerBuffer.length > this.config.bufferLength) {
                    this.innerBuffer.splice(0, this.innerBuffer.length - this.config.bufferLength)
                }
            }
        })

        this.connection.addEventListener('close', () => {
            if (session !== this.sessionId) return
            const delay = Math.min(
                this.config.retryInterval * Math.pow(2, this.retryCount),
                this.maxRetryInterval,
            )
            this.retryCount++
            setTimeout(() => this.connectWebsocket(session), delay)
        })

        this.connection.addEventListener('error', err => {
            this.EE.emit('error', err)
            this.connection?.close()
        })
    }

    connect (url: string) {
        if (this.url === url && this.connection) {
            return
        }
        this.url = url
        this.sessionId++
        this.retryCount = 0
        this.connection?.close()
        this.connectWebsocket(this.sessionId)
    }

    subscribe (event: string, callback: (data: T[]) => void) {
        this.EE.addListener(event, callback)
    }

    unsubscribe (event: string, callback: (data: T[]) => void) {
        this.EE.removeListener(event, callback)
    }

    buffer () {
        return this.innerBuffer.slice()
    }

    destory () {
        this.sessionId++
        this.EE.removeAllListeners()
        this.connection?.close()
        this.connection = null
    }
}
