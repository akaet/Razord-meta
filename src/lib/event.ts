import EventEmitter from 'eventemitter3'

export enum Action {
}

class Event {
    protected EE = new EventEmitter()

    subscribe<T> (event: Action, callback: (data?: T) => void) {
        this.EE.addListener(event, callback)
    }

    unsubscribe<T> (event: Action, callback: (data?: T) => void) {
        this.EE.removeListener(event, callback)
    }
}

export default new Event()
