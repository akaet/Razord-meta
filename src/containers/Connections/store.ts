import produce from 'immer'
import { useState, useCallback, useEffect } from 'react'

import * as API from '@lib/request'

export type Connection = API.Connections & { completed?: boolean, uploadSpeed: number, downloadSpeed: number }

export interface FormatConnection {
    id: string
    host: string
    sniffHost: string
    chains: string
    rule: string
    time: number
    upload: number
    download: number
    typeNetwork: string
    process?: string
    sourceIP: string
    destinationIP?: string
    speed: {
        upload: number
        download: number
    }
    completed: boolean
    original: Connection
}

class Store {
    protected connections = new Map<string, Connection>()

    protected previousSnapshot = new Map<string, API.Connections>()

    protected saveDisconnection = false

    protected listeners = new Set<() => void>()

    appendToSet (connections: API.Connections[]) {
        const mapping = connections.reduce(
            (map, c) => map.set(c.id, c), new Map<string, API.Connections>(),
        )

        for (const id of this.connections.keys()) {
            if (!mapping.has(id)) {
                if (!this.saveDisconnection) {
                    this.connections.delete(id)
                } else {
                    const connection = this.connections.get(id)
                    if (connection != null) {
                        this.connections.set(id, produce(connection, draft => {
                            draft.completed = true
                            draft.uploadSpeed = 0
                            draft.downloadSpeed = 0
                        }))
                    }
                }
            }
        }

        for (const [id, n] of mapping.entries()) {
            const prev = this.previousSnapshot.get(id)
            this.connections.set(id, {
                ...n,
                uploadSpeed: prev ? n.upload - prev.upload : 0,
                downloadSpeed: prev ? n.download - prev.download : 0,
            })
        }

        this.previousSnapshot = mapping
        this.notifyListeners()
    }

    toggleSave () {
        if (this.saveDisconnection) {
            this.saveDisconnection = false
            for (const id of this.connections.keys()) {
                if (this.connections?.get(id)?.completed) {
                    this.connections.delete(id)
                }
            }
        } else {
            this.saveDisconnection = true
        }

        this.notifyListeners()
        return this.saveDisconnection
    }

    getConnections () {
        return [...this.connections.values()]
    }

    getSaveState () {
        return this.saveDisconnection
    }

    subscribe (listener: () => void) {
        this.listeners.add(listener)
        return () => {
            this.listeners.delete(listener)
        }
    }

    protected notifyListeners () {
        this.listeners.forEach(listener => listener())
    }
}

// 全局单例 store
const globalStore = new Store()

export function useConnections () {
    const [connections, setConnections] = useState<Connection[]>(globalStore.getConnections())
    const [save, setSave] = useState<boolean>(globalStore.getSaveState())

    useEffect(() => {
        const unsubscribe = globalStore.subscribe(() => {
            setConnections(globalStore.getConnections())
            setSave(globalStore.getSaveState())
        })
        return unsubscribe
    }, [])

    const feed = useCallback(function (connections: API.Connections[]) {
        globalStore.appendToSet(connections)
    }, [])

    const toggleSave = useCallback(function () {
        const state = globalStore.toggleSave()
        setSave(state)
    }, [])

    return { connections, feed, toggleSave, save }
}
