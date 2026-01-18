import classnames from 'classnames'
import { useState, ReactNode, useRef, MouseEvent, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

import './style.scss'

interface TooltipProps {
    children: ReactNode
    content: ReactNode
    className?: string
    delay?: number
}

export function Tooltip({ children, content, className, delay = 0 }: TooltipProps) {
    const [visible, setVisible] = useState(false)
    const [rendered, setRendered] = useState(false)
    const [position, setPosition] = useState({ top: 0, left: 0, place: 'top' as 'top' | 'bottom', align: 'left' as 'left' | 'right' })
    const timeoutRef = useRef<number | null>(null)
    const unmountRef = useRef<number | null>(null)
    const tooltipRef = useRef<HTMLDivElement>(null)
    const triggerRectRef = useRef<DOMRect | null>(null)

    const handleMouseEnter = (e: MouseEvent) => {
        // Clear any pending unmount to allow quick re-entry
        if (unmountRef.current !== null) {
            window.clearTimeout(unmountRef.current)
            unmountRef.current = null
        }

        // 查找父 tag 元素（li）
        let targetElement = e.currentTarget as HTMLElement
        let parentLi = targetElement.closest('li')
        
        // 如果找到了 li 父元素，使用 li 的位置；否则使用当前元素的位置
        const rect = parentLi ? parentLi.getBoundingClientRect() : targetElement.getBoundingClientRect()
        triggerRectRef.current = rect
        const place: 'top' | 'bottom' = rect.top < 300 ? 'bottom' : 'top'
        // 初始位置设为左对齐，后续会根据空间调整
        const pos = {
            top: place === 'top' ? rect.top : rect.bottom,
            left: rect.left,
            place,
            align: 'left' as 'left' | 'right'
        }
        setPosition(pos)

        // If already rendered (e.g. quick exit-enter), show immediately
        // Otherwise wait for delay
        if (rendered && visible) {
            return
        }

        if (rendered && !visible) {
            setVisible(true)
            return
        }

        if (delay > 0) {
            timeoutRef.current = window.setTimeout(() => {
                setRendered(true)
                // Small delay to allow render before adding visible class for transition
                requestAnimationFrame(() => setVisible(true))
            }, delay)
        } else {
            setRendered(true)
            requestAnimationFrame(() => setVisible(true))
        }
    }

    const handleMouseLeave = () => {
        if (timeoutRef.current !== null) {
            window.clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
        setVisible(false)

        // Wait for animation to finish before unmounting
        unmountRef.current = window.setTimeout(() => {
            setRendered(false)
        }, 300) // Match CSS transition duration
    }

    // 在 tooltip 渲染后调整位置（智能对齐）
    useLayoutEffect(() => {
        if (!rendered || !tooltipRef.current || !triggerRectRef.current) return

        // 使用 requestAnimationFrame 确保 DOM 已完全渲染
        requestAnimationFrame(() => {
            if (!tooltipRef.current || !triggerRectRef.current) return

            const tooltip = tooltipRef.current
            const rect = triggerRectRef.current
            const tooltipWidth = tooltip.offsetWidth || tooltip.scrollWidth
            const windowWidth = window.innerWidth

            // 先尝试左对齐（tooltip 左边与触发元素左边对齐）
            const leftAlignedLeft = rect.left
            const leftAlignedRight = leftAlignedLeft + tooltipWidth

            // 如果左对齐会超出屏幕，则右对齐（tooltip 右边与触发元素右边对齐）
            const align = leftAlignedRight <= windowWidth ? 'left' : 'right'
            const left = align === 'left' ? rect.left : rect.right - tooltipWidth

            setPosition(prev => ({
                ...prev,
                left,
                align
            }))
        })
    }, [rendered, content])

    // Cleanup timers on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            if (timeoutRef.current !== null) {
                window.clearTimeout(timeoutRef.current)
                timeoutRef.current = null
            }
            if (unmountRef.current !== null) {
                window.clearTimeout(unmountRef.current)
                unmountRef.current = null
            }
        }
    }, [])

    const tooltip = rendered && createPortal(
        <div
            ref={tooltipRef}
            className={classnames('tooltip', { 'tooltip-visible': visible })}
            style={{
                top: position.top,
                left: position.left,
                position: 'fixed',
                transform: position.place === 'top'
                    ? 'translateY(-100%) translateY(-8px)'
                    : 'translateY(8px)'
            }}
        >
            <div className="tooltip-content-wrapper">
                {content}
            </div>
        </div>,
        document.body
    )

    return (
        <div
            className={classnames('tooltip-container', className)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
            {tooltip}
        </div>
    )
}
