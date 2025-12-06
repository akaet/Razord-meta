import dayjs from 'dayjs'
import { camelCase, groupBy } from 'lodash-es'
import { useLayoutEffect, useEffect, useRef, useState, useMemo } from 'react'

import { Select, Card, Header, HistoryInput } from '@components'
import { Devices } from '../Connections/Devices'
import { useConnections } from '../Connections/store'
import * as API from '@lib/request'
import { Log } from '@models/Log'
import { useConfig, useI18n, useLogsStreamReader, useConnectionStreamReader } from '@stores'

import './style.scss'

const logLevelOptions = [
    { label: 'Default', value: '' },
    { label: 'Debug', value: 'debug' },
    { label: 'Info', value: 'info' },
    { label: 'Warn', value: 'warning' },
    { label: 'Error', value: 'error' },
    { label: 'Silent', value: 'silent' },
]
const logMap = new Map([
    ['debug', 'text-teal-500'],
    ['info', 'text-sky-500'],
    ['warning', 'text-pink-500'],
    ['error', 'text-rose-500'],
])

export default function Logs () {
    const listRef = useRef<HTMLUListElement>(null)
    const logsRef = useRef<Log[]>([])
    const [logs, setLogs] = useState<Log[]>([])
    const { translation } = useI18n()
    const { data: { logLevel }, set: setConfig } = useConfig()
    const { t } = translation('Logs')
    const logsStreamReader = useLogsStreamReader()
    const connStreamReader = useConnectionStreamReader()
    const scrollHeightRef = useRef(listRef.current?.scrollHeight ?? 0)

    useLayoutEffect(() => {
        const ul = listRef.current
        if (ul != null && scrollHeightRef.current === (ul.scrollTop + ul.clientHeight)) {
            ul.scrollTop = ul.scrollHeight - ul.clientHeight
        }
        scrollHeightRef.current = ul?.scrollHeight ?? 0
    })

    useEffect(() => {
        function handleLog (newLogs: Log[]) {
            logsRef.current = logsRef.current.slice().concat(newLogs.map(d => ({ ...d, time: new Date() })))
            setLogs(logsRef.current)
        }

        if (logsStreamReader != null) {
            logsStreamReader.subscribe('data', handleLog)
            logsRef.current = logsStreamReader.buffer()
            setLogs(logsRef.current)
        }
        return () => logsStreamReader?.unsubscribe('data', handleLog)
    }, [logsStreamReader])

    const { connections, feed } = useConnections()
    useEffect(() => {
        function handleConnection(snapshots: API.Snapshot[]) {
            for (const snapshot of snapshots) {
                feed(snapshot.connections)
            }
        }

        connStreamReader?.subscribe('data', handleConnection)
        return () => {
            connStreamReader?.unsubscribe('data', handleConnection)
        }
    }, [connStreamReader, feed])

    const [device, setDevice] = useState('')
    const devices = useMemo(() => {
        const gb = groupBy(connections, 'metadata.sourceIP')
        return Object.keys(gb)
            .map(key => {
                const count = logs.filter(l => l.payload.includes(key)).length
                return { label: key, number: count }
            })
            .filter(d => d.number > 0)
            .sort((a, b) => a.label.localeCompare(b.label))
    }, [connections, logs])

    const [searchText, setSearchText] = useState('')
    const displayLogs = useMemo(() => {
        let result = logs
        if (device !== '') {
            result = result.filter(l => l.payload.includes(device))
        }

        if (searchText !== '') {
            try {
                const reg = new RegExp(searchText, 'i')
                result = result.filter(l => reg.test(l.payload))
            } catch (e) {
                result = result.filter(l => l.payload.toLowerCase().includes(searchText.toLowerCase()))
            }
        }

        return result
    }, [device, logs, searchText])

    return (
        <div className="page">
            <Header title={ t('title') } >
                <HistoryInput
                    className="mr-4 w-60"
                    align="left"
                    inside={true}
                    value={searchText}
                    onChange={setSearchText}
                    onEnter={setSearchText}
                    placeholder={t('search')}
                    allowClear
                    storageKey="logSearchHistory"
                />
                <span className="text-sm text-primary-darken mr-2">{t('levelLabel')}:</span>
                <Select
                    options={logLevelOptions}
                    value={camelCase(logLevel)}
                    onSelect={level => setConfig(c => { c.logLevel = level })}
                />
            </Header>
            {devices.length > 0 && <Devices devices={devices} selected={device} onChange={setDevice} />}
            <Card className="flex flex-col flex-1 mt-2.5">
                <ul className="logs-panel" ref={listRef}>
                    {
                        displayLogs.map(
                            (log, index) => (
                                <li className="leading-5 inline-block" key={index}>
                                    <span className="mr-2 text-orange-400">[{ dayjs(log.time).format('YYYY-MM-DD HH:mm:ss') }]</span>
                                    <span className={logMap.get(log.type)}>[{ log.type.toUpperCase() }]</span>
                                    <span> { log.payload }</span>
                                </li>
                            ),
                        )
                    }
                </ul>
            </Card>
        </div>
    )
}
