import classnames from 'classnames'
import { useAtom } from 'jotai'
import { useState, useRef, useLayoutEffect, useCallback } from 'react'
import dayjs from 'dayjs'

import fixedImg from '@assets/fixed.png'
import trendImg from '@assets/trend.png'
import { noop } from '@lib/helper'
import { Group as IGroup } from '@lib/request'
import { BaseComponentProps } from '@models'
import { proxyMapping, useI18n, useSpeedTestConfig } from '@stores'

import { Tooltip } from '../Tooltip'
import './style.scss'

interface TagsProps extends BaseComponentProps {
    data: string[]
    onClick: (name: string) => void
    errSet?: Set<string>
    select: string
    rowHeight: number
    canClick: boolean
    fixed?: string
    group: IGroup
}

export function Tags (props: TagsProps) {
    const { className, data, onClick, select, canClick, errSet, rowHeight: rawHeight, fixed, group } = props
    const { translation } = useI18n()
    const { t } = translation('Proxies')
    const [expand, setExpand] = useState(false)
    const [showExtend, setShowExtend] = useState(false)
    const [proxyMap] = useAtom(proxyMapping)
    const { config: speedTestConfig } = useSpeedTestConfig()

    const ulRef = useRef<HTMLUListElement>(null)
    useLayoutEffect(() => {
        setShowExtend((ulRef?.current?.offsetHeight ?? 0) > 30)
    }, [])

    const rowHeight = expand ? 'auto' : rawHeight
    const handleClick = canClick ? onClick : noop

    // 根据延迟获取颜色
    const getColorForDelay = useCallback((delay: number) => {
        if (delay === 0) {
            return '#909399' // 灰色（无连接）
        }
        if (delay < speedTestConfig.lowLatency) {
            return '#57b366' // 绿色（良好）
        }
        if (delay < speedTestConfig.mediumLatency) {
            return '#ff9a28' // 黄色（中等）
        }
        return '#ff3e5e' // 红色（较差）
    }, [speedTestConfig.lowLatency, speedTestConfig.mediumLatency])

    function toggleExtend () {
        setExpand(!expand)
    }
    const tags = data
        .map(t => {
            const click = canClick ? 'cursor-pointer' : 'cursor-default'
            const tagClass = classnames(click, { 'tags-selected': select === t, error: errSet?.has(t) })
            const history = proxyMap.get(t)?.history
            const delay = history?.length ? history.slice(-1)[0].delay : 0
            const color = getColorForDelay(delay)
            return (
                <li className={tagClass} key={t} onClick={() => handleClick(t)}>
                    { t === fixed && <img className="proxy-fixed" src={fixedImg} width={11} height={11} alt={''}/> }
                    { t }
                    {group.type === 'URLTest' && history && history.length > 0 && (
                        <Tooltip
                            delay={600}
                            content={
                                history.map((h, i) => {
                                    const historyColor = getColorForDelay(h.delay)
                                    return (
                                        <div key={i}>
                                            {dayjs(h.time).format('YYYY-MM-DD HH:mm:ss')} <span style={{ color: historyColor }}>{h.delay}ms</span>
                                        </div>
                                    )
                                })
                            }
                        >
                            <span className="proxy-delay" style={{ color }}>
                                &emsp;
                                {delay === 0 && <img src={trendImg} width={11} height={11} alt="trend" />}
                                {delay !== 0 && `${delay}ms`}
                            </span>
                        </Tooltip>
                    )}
                    {!(group.type === 'URLTest' && history && history.length > 0) && delay !== 0 && (
                        <span className="proxy-delay" style={{ color }}>&emsp;{`${delay}ms`}</span>
                    )}
                </li>
            )
        })

    return (
        <div className={classnames('flex items-start overflow-y-hidden', className)} style={{ height: rowHeight }}>
            <ul ref={ulRef} className={classnames('tags', { expand })}>
                { tags }
            </ul>
            {
                showExtend &&
                <span className="h-7 px-5 select-none cursor-pointer leading-7" onClick={toggleExtend}>{ expand ? t('collapseText') : t('expandText') }</span>
            }
        </div>
    )
}
