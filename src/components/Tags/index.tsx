import classnames from 'classnames'
import { useAtom } from 'jotai'
import { useState, useRef, useLayoutEffect, useMemo } from 'react'

import { noop } from '@lib/helper'
import { BaseComponentProps } from '@models'
import { proxyMapping, useConfig, useI18n } from '@stores'

import './style.scss'

interface TagsProps extends BaseComponentProps {
    data: string[]
    onClick: (name: string) => void
    errSet?: Set<string>
    select: string
    rowHeight: number
    canClick: boolean
}

export function Tags (props: TagsProps) {
    const { className, data, onClick, select, canClick, errSet, rowHeight: rawHeight } = props
    const { translation } = useI18n()
    const { t } = translation('Proxies')
    const [expand, setExpand] = useState(false)
    const [showExtend, setShowExtend] = useState(false)
    const [proxyMap] = useAtom(proxyMapping)

    const { data: { thresholdYellow = 300, thresholdRed = 600 } } = useConfig()

    const ProxyColors = useMemo(() => ({
        '#909399': 0,
        '#57b366': thresholdYellow,
        '#ff9a28': thresholdRed,
        '#ff3e5e': Infinity,
    }), [thresholdYellow, thresholdRed])

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
                    { t } <span className="proxy-delay" style={{ color }}>&emsp;{delay === 0 ? '' : `${delay}ms`}  </span>
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
