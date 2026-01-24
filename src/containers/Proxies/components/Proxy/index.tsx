import classnames from 'classnames'
import { useMemo } from 'react'

import { Proxy as IProxy } from '@lib/request'
import { BaseComponentProps } from '@models'
import { useSpeedTestConfig } from '@stores'

import './style.scss'

interface ProxyProps extends BaseComponentProps {
    config: IProxy
}

export function Proxy (props: ProxyProps) {
    const { config, className } = props
    const { config: speedTestConfig } = useSpeedTestConfig()

    const delay = useMemo(
        () => config.history?.length ? config.history.slice(-1)[0].delay : 0,
        [config],
    )

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
