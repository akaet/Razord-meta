import classnames from 'classnames'
import { useRef, useState, useMemo, useLayoutEffect, useEffect } from 'react'
import { createPortal } from 'react-dom'

import { Icon } from '@components'
import { noop } from '@lib/helper'
import { BaseComponentProps } from '@models'

import './style.scss'

export interface SelectOptions<T extends string | number> {
    label: string
    value: T
    disabled?: boolean
    key?: React.Key
}

interface SelectProps<T extends string | number> extends BaseComponentProps {
    /**
     * selected value
     * must match one of options
     */
    value: T

    options: Array<SelectOptions<T>>

    onSelect?: (value: T, e: React.MouseEvent<HTMLLIElement>) => void

    /**
     * max height of dropdown list
     * default: 300px
     */
    maxHeight?: number | string
}

export function Select<T extends string | number> (props: SelectProps<T>) {
    const { value, options, onSelect, className: cn, style, maxHeight = 300 } = props

    const portalRef = useRef(document.createElement('div'))
    const targetRef = useRef<HTMLDivElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    const [showDropDownList, setShowDropDownList] = useState(false)
    const [dropdownListStyles, setDropdownListStyles] = useState<React.CSSProperties>({})
    
    useLayoutEffect(() => {
        if (!showDropDownList) return

        const targetRectInfo = targetRef.current!.getBoundingClientRect()
        
        // 初始位置设为左对齐
        const initialLeft = Math.floor(targetRectInfo.left)
        setDropdownListStyles({
            top: Math.floor(targetRectInfo.top + targetRectInfo.height) + 6,
            left: initialLeft,
            minWidth: targetRectInfo.width,
        })

        // 使用 requestAnimationFrame 确保 DOM 已渲染，然后计算是否需要右对齐
        requestAnimationFrame(() => {
            if (!listRef.current || !showDropDownList) return

            const listWidth = listRef.current.offsetWidth || listRef.current.scrollWidth
            const windowWidth = window.innerWidth
            const leftAlignedRight = initialLeft + listWidth

            // 如果左对齐会超出屏幕，则右对齐
            const finalLeft = leftAlignedRight <= windowWidth 
                ? initialLeft 
                : targetRectInfo.right - listWidth

            setDropdownListStyles(prev => ({
                ...prev,
                left: Math.max(0, finalLeft), // 确保不会超出左边界
            }))
        })
    }, [showDropDownList])

    useLayoutEffect(() => {
        const current = portalRef.current
        document.body.appendChild(current)
        return () => {
            document.body.removeChild(current)
        }
    }, [])

    // 点击外部区域关闭下拉列表
    useEffect(() => {
        if (!showDropDownList) return

        function handleClickOutside (e: MouseEvent) {
            const target = e.target as Node
            if (
                targetRef.current &&
                listRef.current &&
                !targetRef.current.contains(target) &&
                !listRef.current.contains(target)
            ) {
                setShowDropDownList(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showDropDownList])

    function handleShowDropList () {
        setShowDropDownList(!showDropDownList)
    }

    const matchChild = useMemo(
        () => options.find(o => o.value === value),
        [value, options],
    )

    const dropDownList = (
        <div
            ref={listRef}
            className={classnames('select-list', { 'select-list-show': showDropDownList })}
            style={dropdownListStyles}
        >
            <ul className="list" style={{ maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }}>
                {
                    options.map(option => (
                        <Option
                            className={classnames({ selected: option.value === value })}
                            onClick={e => {
                                onSelect?.(option.value, e)
                                setShowDropDownList(false)
                            }}
                            disabled={option.disabled}
                            key={option.key ?? option.value}
                            value={option.value}>
                            {option.label}
                        </Option>
                    ))
                }
            </ul>
        </div>
    )

    return (
        <>
            <div
                className={classnames('select', cn)}
                style={style}
                ref={targetRef}
                onClick={handleShowDropList}
            >
                {matchChild?.label}
                <Icon type="triangle-down" />
            </div>
            {createPortal(dropDownList, portalRef.current)}
        </>
    )
}

interface OptionProps<T> extends BaseComponentProps {
    value: T
    disabled?: boolean
    onClick?: (e: React.MouseEvent<HTMLLIElement>) => void
}

function Option<T> (props: OptionProps<T>) {
    const { className: cn, style, disabled = false, children, onClick = noop } = props
    const className = classnames('option', { disabled }, cn)

    return (
        <li className={className} style={style} onClick={onClick}>{children}</li>
    )
}
