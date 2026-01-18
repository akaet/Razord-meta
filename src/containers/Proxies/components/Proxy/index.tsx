import type{ AxiosError } from 'axios'
import classnames from 'classnames'
import { ResultAsync } from 'neverthrow'
import { useMemo, useLayoutEffect, useCallback } from 'react'

import EE, { Action } from '@lib/event'
import { isClashX, jsBridge } from '@lib/jsBridge'
import { Proxy as IProxy } from '@lib/request'
import { BaseComponentProps } from '@models'
import { useClient, useProxy, useSpeedTestConfig } from '@stores'

import './style.scss'

interface ProxyProps extends BaseComponentProps {
    config: IProxy
}

export function Proxy (props: ProxyProps) {
    const { config, className } = props
    const { set } = useProxy()
    const client = useClient()
    const { config: speedTestConfig } = useSpeedTestConfig()

    const getDelay = useCallback(async (name: string) => {
        if (isClashX()) {
            const delay = await jsBridge?.getProxyDelay(name) ?? 0
            return delay
        }

        const { data: { delay } } = await client.getProxyDelay(
            name,
            speedTestConfig.speedtestUrl,
            speedTestConfig.speedtestTimeout
        )
        return delay
    }, [client, speedTestConfig])

    const speedTest = useCallback(async function () {
        const result = await ResultAsync.fromPromise(getDelay(config.name), e => e as AxiosError)

        const validDelay = result.isErr() ? 0 : result.value
        set(draft => {
            const proxy = draft.proxies.find(p => p.name === config.name)
            if (proxy != null) {
                proxy.history.push({ time: new Date().toISOString(), delay: validDelay })
            }
        })
    }, [config.name, getDelay, set])

    const delay = useMemo(
        () => config.history?.length ? config.history.slice(-1)[0].delay : 0,
        [config],
    )

    useLayoutEffect(() => {
        const handler = () => { speedTest() }
        EE.subscribe(Action.SPEED_NOTIFY, handler)
        return () => EE.unsubscribe(Action.SPEED_NOTIFY, handler)
    }, [speedTest])

    const hasError = useMemo(() => delay === 0, [delay])
    const color = useMemo(() => {
        if (hasError) return undefined
        if (delay < speedTestConfig.lowLatency) return '#57b366' // 绿色
        if (delay < speedTestConfig.mediumLatency) return '#ff9a28' // 黄色
        return '#ff3e5e' // 红色
    }, [delay, hasError, speedTestConfig.lowLatency, speedTestConfig.mediumLatency])

    const backgroundColor = hasError ? undefined : color
    return (
        <div className={classnames('proxy-item', { 'proxy-error': hasError }, className)}>
            <span className="proxy-type" style={{ backgroundColor }}>{config.type}</span>
            <p className="proxy-name">{config.name}</p>
            <p className="proxy-delay" style={{ color }}>{delay === 0 ? '-' : `${delay}ms`}</p>
            <span className="proxy-udp" >{config.xudp.valueOf() ? "XUDP" : config.udp.valueOf() ? 'UDP' : null}</span>
        </div>
    )
}
