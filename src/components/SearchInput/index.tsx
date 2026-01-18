import classnames from 'classnames'
import { useState, useRef, useEffect } from 'react'

import { Icon } from '../Icon'
import { Input } from '../Input'
import { BaseComponentProps } from '@models'
import './style.scss'

interface SearchInputProps extends BaseComponentProps {
    /** 输入框的值（受控） */
    value?: string
    /** 占位符文本 */
    placeholder?: string
    /** 搜索回调，当用户按下回车或点击历史记录时触发 */
    onSearch?: (keyword: string) => void
    /** 清除回调，当用户点击清除按钮时触发 */
    onClear?: () => void
    /** localStorage存储键，用于区分不同页面的历史记录 */
    storageKey?: string
    /** 最大历史记录数量，默认10条 */
    maxHistory?: number
    /** 输入框最小宽度，默认200px */
    minWidth?: string
    /** 文本对齐方式，默认right */
    align?: 'left' | 'center' | 'right'
    /** 历史记录列表最大高度，默认300px */
    maxHeight?: number | string
}

const DEFAULT_STORAGE_KEY = 'search-history'
const DEFAULT_MAX_HISTORY = 10

export function SearchInput (props: SearchInputProps) {
    const {
        className,
        style,
        value: propValue = '',
        placeholder = '搜索...',
        onSearch,
        onClear,
        storageKey = DEFAULT_STORAGE_KEY,
        maxHistory = DEFAULT_MAX_HISTORY,
        minWidth = '200px',
        align = 'right',
        maxHeight = 300,
    } = props

    const [keyword, setKeyword] = useState(propValue)
    const [showHistory, setShowHistory] = useState(false)
    const [history, setHistory] = useState<string[]>([])
    const containerRef = useRef<HTMLDivElement>(null)
    const blurTimeoutRef = useRef<number | null>(null)

    // 同步外部value变化
    useEffect(() => {
        setKeyword(propValue)
    }, [propValue])

    // 从 localStorage 加载历史记录
    useEffect(() => {
        try {
            const stored = localStorage.getItem(storageKey)
            if (stored) {
                const parsed = JSON.parse(stored) as string[]
                // 去重处理
                const uniqueHistory = Array.from(new Set(Array.isArray(parsed) ? parsed : []))
                setHistory(uniqueHistory)
            }
        } catch (e) {
            // 忽略解析错误
        }
    }, [storageKey])

    // 保存历史记录到 localStorage
    const saveHistory = (newHistory: string[]) => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(newHistory))
            setHistory(newHistory)
        } catch (e) {
            // 忽略存储错误
        }
    }

    // 添加到历史记录
    const addToHistory = (keyword: string) => {
        if (!keyword.trim()) return

        const trimmed = keyword.trim()
        // 去重：先移除重复项，再添加到最前面
        const newHistory = [
            trimmed,
            ...history.filter(h => h !== trimmed),
        ].slice(0, maxHistory)

        saveHistory(newHistory)
    }

    // 处理搜索
    const handleSearch = (newKeyword: string) => {
        setKeyword(newKeyword)
        if (newKeyword.trim()) {
            addToHistory(newKeyword.trim())
        }
        onSearch?.(newKeyword)
        setShowHistory(false)
    }

    // 处理输入变化
    const handleChange = (newValue: string) => {
        setKeyword(newValue)
    }

    // 处理清除
    const handleClear = () => {
        setKeyword('')
        onClear?.()
        setShowHistory(false)
    }

    // 处理历史记录点击
    const handleHistoryClick = (item: string) => {
        handleSearch(item)
    }

    // 处理删除单条历史记录
    const handleDeleteHistory = (item: string, e: React.MouseEvent) => {
        e.stopPropagation() // 阻止触发item的点击事件
        const newHistory = history.filter(h => h !== item)
        saveHistory(newHistory)
        
        // 如果删除的历史记录和当前输入框内容一样，清空输入框
        if (keyword.trim() === item.trim()) {
            setKeyword('')
            // 不调用 onClear，避免关闭弹窗
        }
        
        // 删除后如果没有历史记录了，关闭弹窗；否则保持弹窗打开
        if (newHistory.length === 0) {
            setShowHistory(false)
        } else {
            // 确保弹窗保持打开
            setShowHistory(true)
        }
    }

    // 点击外部关闭历史记录
    useEffect(() => {
        function handleClickOutside (e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowHistory(false)
            }
        }

        if (showHistory) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => {
                document.removeEventListener('mousedown', handleClickOutside)
            }
        }
    }, [showHistory])

    // 清理timeout
    useEffect(() => {
        return () => {
            if (blurTimeoutRef.current !== null) {
                window.clearTimeout(blurTimeoutRef.current)
            }
        }
    }, [])

    return (
        <div ref={containerRef} className={classnames('search-input', className)} style={style}>
            <div className="search-input-wrapper" style={{ minWidth }}>
                <Input
                    className="search-input-field"
                    value={keyword}
                    placeholder={placeholder}
                    align={align}
                    onChange={handleChange}
                    onEnter={() => handleSearch(keyword)}
                    onBlur={() => {
                        // 延迟关闭，以便点击历史记录
                        blurTimeoutRef.current = window.setTimeout(() => {
                            setShowHistory(false)
                            blurTimeoutRef.current = null
                        }, 200)
                    }}
                    onFocus={() => {
                        // 清除可能存在的blur timeout
                        if (blurTimeoutRef.current !== null) {
                            window.clearTimeout(blurTimeoutRef.current)
                            blurTimeoutRef.current = null
                        }
                        setShowHistory(true)
                    }}
                />
                {keyword && (
                    <Icon
                        type="close"
                        size={14}
                        className="search-input-clear"
                        onClick={handleClear}
                    />
                )}
            </div>
            {showHistory && history.length > 0 && (
                <div 
                    className="search-input-history"
                    style={{ maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }}
                >
                    <ul className="search-input-history-list">
                        {history.map((item, index) => (
                            <li
                                key={`${item}-${index}`}
                                className="search-input-history-item"
                                onClick={() => handleHistoryClick(item)}
                            >
                                <span className="search-input-history-item-text">{item}</span>
                                <Icon
                                    type="close"
                                    size={12}
                                    className="search-input-history-item-delete"
                                    onClick={(e) => handleDeleteHistory(item, e as React.MouseEvent)}
                                />
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
