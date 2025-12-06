import classnames from 'classnames'
import { KeyboardEvent, useState, useRef, useEffect, FocusEvent, useMemo } from 'react'
import { useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import { Input } from '@components'
import { noop } from '@lib/helper'
import { BaseComponentProps } from '@models/BaseProps'

import './style.scss'

import closeIcon from '@assets/close.png'

interface HistoryInputProps extends BaseComponentProps {
    value?: string
    align?: 'left' | 'center' | 'right'
    inside?: boolean
    autoFocus?: boolean
    placeholder?: string
    onChange?: (value: string) => void
    onEnter?: (value: string) => void
    allowClear?: boolean
    onBlur?: (event?: FocusEvent<HTMLInputElement>) => void
    onFocus?: (event?: FocusEvent<HTMLInputElement>) => void
    storageKey: string
}

export function HistoryInput(props: HistoryInputProps) {
    const {
        className,
        style,
        value = '',
        onChange = noop,
        onEnter = noop,
        onBlur,
        onFocus,
        storageKey,
        ...rest
    } = props

    const historyAtom = useMemo(() => atomWithStorage<string[]>(storageKey, []), [storageKey])
    const [history, setHistory] = useAtom(historyAtom)
    const [showDropdown, setShowDropdown] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Handle clicking outside to close dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const handleFocus = (e?: FocusEvent<HTMLInputElement>) => {
        if (history.length > 0) {
            setShowDropdown(true)
        }
        onFocus?.(e)
    }

    const handleChange = (val: string) => {
        onChange(val)
    }

    const handleEnter = (e?: KeyboardEvent<HTMLInputElement>) => {
        onEnter(value)
        setShowDropdown(false)

        if (value.trim()) {
            const newHistory = [value, ...history.filter(h => h !== value)].slice(0, 10)
            setHistory(newHistory)
        }
    }

    const handleSelect = (item: string) => {
        onChange(item)
        setShowDropdown(false)
        onEnter(item) // Trigger search immediately on selection
    }

    const handleDelete = (e: React.MouseEvent, item: string) => {
        e.stopPropagation()
        setHistory(history.filter(h => h !== item))
    }

    return (
        <div className={classnames('history-input-wrapper', className)} style={style} ref={containerRef}>
            <Input
                className="w-full"
                value={value}
                onChange={handleChange}
                onEnter={handleEnter}
                onBlur={onBlur}
                onFocus={handleFocus}
                {...rest}
            />
            {showDropdown && history.length > 0 && (
                <div className="history-dropdown">
                    {history.map((item, index) => (
                        <div key={index} className="history-item" onClick={() => handleSelect(item)}>
                            <span className="truncate flex-1 mr-2">{item}</span>
                            <img
                                src={closeIcon}
                                className="delete-icon"
                                onClick={(e) => handleDelete(e, item)}
                                title="Delete"
                                alt="delete"
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
