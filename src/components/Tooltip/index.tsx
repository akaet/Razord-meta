import classnames from 'classnames'
import { useState, ReactNode, useRef, MouseEvent } from 'react'
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
    const [position, setPosition] = useState({ top: 0, left: 0, place: 'top' })
    const timeoutRef = useRef<number | null>(null)
    const unmountRef = useRef<number | null>(null)

    const handleMouseEnter = (e: MouseEvent) => {
        // Clear any pending unmount to allow quick re-entry
        if (unmountRef.current !== null) {
            window.clearTimeout(unmountRef.current)
            unmountRef.current = null
        }

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        const place = rect.top < 300 ? 'bottom' : 'top'
        const pos = {
            top: place === 'top' ? rect.top : rect.bottom,
            left: rect.left + rect.width / 2,
            place
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

    const tooltip = rendered && createPortal(
        <div
            className={classnames('tooltip', { 'tooltip-visible': visible })}
            style={{
                top: position.top,
                left: position.left,
                position: 'fixed',
                transform: position.place === 'top'
                    ? 'translate(-50%, -100%) translateY(-8px)'
                    : 'translate(-50%, 0) translateY(8px)'
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
