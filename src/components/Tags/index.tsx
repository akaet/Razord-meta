import classnames from 'classnames'
import { useAtom } from 'jotai'
import { useState, useRef, useLayoutEffect } from 'react'
import dayjs from 'dayjs'

import fixedImg from '@assets/fixed.png'
import trendImg from '@assets/trend.png'
import { noop } from '@lib/helper'
import { Group as IGroup } from '@lib/request'
import { BaseComponentProps } from '@models'
import { proxyMapping, useI18n } from '@stores'

import { Tooltip } from '../Tooltip'
import './style.scss'

const ProxyColors = {
    '#909399': 0,
    '#57b366': 260,
    '#ff9a28': 600,
    '#ff3e5e': Infinity,
}

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

    const ulRef = useRef<HTMLUListElement>(null)
    useLayoutEffect(() => {
        setShowExtend((ulRef?.current?.offsetHeight ?? 0) > 30)
    }, [])

    const rowHeight = expand ? 'auto' : rawHeight
    const handleClick = canClick ? onClick : noop

    function toggleExtend () {
        setExpand(!expand)
    }
    const tags = data
        .map(t => {
            const click = canClick ? 'cursor-pointer' : 'cursor-default'
            const tagClass = classnames(click, { 'tags-selected': select === t, error: errSet?.has(t) })
            const history = proxyMap.get(t)?.history
            const delay = history?.length ? history.slice(-1)[0].delay : 0
            const color = Object.keys(ProxyColors).find(
                threshold => delay <= ProxyColors[threshold as keyof typeof ProxyColors],
            )
            return (
                <li className={tagClass} key={t} onClick={() => handleClick(t)}>
                    { t === fixed && <img className="proxy-fixed" src={fixedImg} width={11} height={11} alt={''}/> }
                    { t }
                    {group.type === 'URLTest' && history && history.length > 0 && (
                        <Tooltip
                            delay={600}
                            content={
                                history.map((h, i) => {
                                    const historyColor = Object.keys(ProxyColors).find(
                                        threshold => h.delay <= ProxyColors[threshold as keyof typeof ProxyColors],
                                    )
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
