import dayjs from 'dayjs'
import { camelCase } from 'lodash-es'
import { useLayoutEffect, useEffect, useRef, useState, useMemo } from 'react'

import { Select, Card, Header, SearchInput } from '@components'
import { Log } from '@models/Log'
import { useConfig, useI18n, useLogsStreamReader } from '@stores'

import './style.scss'

const logLevelOptions = [
    { label: 'Default', value: '' },
    { label: 'Debug', value: 'debug' },
    { label: 'Info', value: 'info' },
    { label: 'Warn', value: 'warning' },
    { label: 'Error', value: 'error' },
    { label: 'Silent', value: 'silent' },
]
const logMap = new Map([
    ['debug', 'text-teal-500'],
    ['info', 'text-sky-500'],
    ['warning', 'text-pink-500'],
    ['error', 'text-rose-500'],
])

// 解析日志 payload 提取信息
interface ParsedLogInfo {
    sourceIP?: string // 源IP地址（从时间和-->之间提取）
}

// 判断是否是IPv4地址
function isIPv4 (text: string): boolean {
    return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(text)
}

// 判断是否是IPv6地址（不带中括号）
function isIPv6 (text: string): boolean {
    // IPv6不包含中括号，包含冒号，且长度合理
    if (!text.includes(':') || text.includes('[') || text.includes(']')) return false
    // 排除时间格式（如 00:20:35）
    if (/^\d{2}:\d{2}:\d{2}$/.test(text)) return false
    // 至少包含2个冒号，且长度合理
    const colonCount = (text.match(/:/g) || []).length
    if (colonCount < 2) return false
    // 排除太短的
    if (text.length < 5) return false
    // 排除以 :: 开头且太短的（如 ::58）
    if (text.startsWith('::') && text.length < 10) return false
    // 基本格式验证：只包含十六进制字符和冒号
    return /^[0-9a-fA-F:]+$/.test(text)
}

// 提取源IP（从时间和-->之间）
function extractSourceIP (payload: string): string | undefined {
    const arrowIndex = payload.indexOf('-->')
    if (arrowIndex === -1) return undefined

    // 提取 --> 之前的内容，移除时间和协议部分
    const beforeArrow = payload.substring(0, arrowIndex)
        .replace(/\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\]/g, '') // 移除时间
        .replace(/\[(TCP|UDP)\]/g, '') // 移除协议
        .trim()
    
    // 按空格分割，从后往前查找IP地址
    const parts = beforeArrow.split(/\s+/)
    
    for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i].trim()
        if (!part) continue
        
        // 匹配带端口的IPv4：xxx.xxx.xxx.xxx:port
        const ipv4WithPort = part.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):\d+$/)
        if (ipv4WithPort) {
            return ipv4WithPort[1]
        }
        
        // 匹配不带端口的IPv4
        if (isIPv4(part)) {
            return part
        }
        
        // 匹配带中括号和端口的IPv6：[xxxx:xxxx:...]:port
        const ipv6Bracketed = part.match(/^\[([0-9a-fA-F:]+)\]:\d+$/)
        if (ipv6Bracketed && isIPv6(ipv6Bracketed[1])) {
            return ipv6Bracketed[1]
        }
        
        // 匹配不带中括号的IPv6（可能带端口）
        const ipv6Match = part.match(/^([0-9a-fA-F:]+)(?::\d+)?$/)
        if (ipv6Match && isIPv6(ipv6Match[1])) {
            return ipv6Match[1]
        }
    }
    
    return undefined
}

export default function Logs () {
    const listRef = useRef<HTMLUListElement>(null)
    const logsRef = useRef<Log[]>([])
    const [logs, setLogs] = useState<Log[]>([])
    const { translation } = useI18n()
    const { data: { logLevel }, set: setConfig } = useConfig()
    const { t } = translation('Logs')
    const logsStreamReader = useLogsStreamReader()
    const scrollHeightRef = useRef(listRef.current?.scrollHeight ?? 0)

    // 筛选条件
    const [selectedIP, setSelectedIP] = useState<string>('')
    const [searchKeyword, setSearchKeyword] = useState<string>('')

    // 缓存解析结果，避免重复解析
    const parsedLogsCacheRef = useRef(new Map<string, ParsedLogInfo>())

    // 解析日志并缓存结果
    const getParsedLogInfo = useMemo(() => {
        return (payload: string): ParsedLogInfo => {
            const cache = parsedLogsCacheRef.current
            if (cache.has(payload)) {
                return cache.get(payload)!
            }
            const sourceIP = extractSourceIP(payload)
            const info: ParsedLogInfo = sourceIP ? { sourceIP } : {}
            cache.set(payload, info)
            return info
        }
    }, [])

    // 从当前日志中提取源 IP 筛选选项
    const ipOptions = useMemo(() => {
        const sourceIPs = new Set<string>()

        logs.forEach(log => {
            if (!log.payload) return
            const info = getParsedLogInfo(log.payload)
            if (info.sourceIP) {
                sourceIPs.add(info.sourceIP)
            }
        })

        // IP 排序：IPv4 在前，IPv6 在后，每组内按字符串排序
        const sortedIPs = Array.from(sourceIPs).sort((a, b) => {
            const aIsIPv4 = isIPv4(a)
            const bIsIPv4 = isIPv4(b)
            if (aIsIPv4 && !bIsIPv4) return -1
            if (!aIsIPv4 && bIsIPv4) return 1
            return a.localeCompare(b)
        })

        const allOption = { label: t('filter.all') as string, value: '' }
        return [allOption, ...sortedIPs.map(ip => ({ label: ip, value: ip }))]
    }, [logs, getParsedLogInfo, t])

    // 根据筛选条件过滤日志
    const filteredLogs = useMemo(() => {
        if (!selectedIP && !searchKeyword.trim()) {
            return logs
        }

        return logs.filter(log => {
            if (!log.payload) return false

            // 源IP筛选
            if (selectedIP) {
                const info = getParsedLogInfo(log.payload)
                if (info.sourceIP !== selectedIP) return false
            }

            // 关键字搜索
            if (searchKeyword.trim()) {
                const keyword = searchKeyword.toLowerCase().trim()
                if (!log.payload.toLowerCase().includes(keyword)) return false
            }

            return true
        })
    }, [logs, selectedIP, searchKeyword, getParsedLogInfo])

    useLayoutEffect(() => {
        const ul = listRef.current
        if (ul != null && scrollHeightRef.current === (ul.scrollTop + ul.clientHeight)) {
            ul.scrollTop = ul.scrollHeight - ul.clientHeight
        }
        scrollHeightRef.current = ul?.scrollHeight ?? 0
    }, [filteredLogs])

    useEffect(() => {
        function handleLog (newLogs: Log[]) {
            logsRef.current = logsRef.current.slice().concat(newLogs.map(d => ({ ...d, time: d.time || new Date() })))
            setLogs(logsRef.current)
        }

        if (logsStreamReader != null) {
            logsStreamReader.subscribe('data', handleLog)
            // 确保 buffer 中的日志都有有效的 time 属性
            logsRef.current = logsStreamReader.buffer().map(log => ({ ...log, time: log.time || new Date() }))
            setLogs(logsRef.current)
        }
        return () => logsStreamReader?.unsubscribe('data', handleLog)
    }, [logsStreamReader])

    return (
        <div className="page">
            <Header title={ t('title') } >
                <Select
                    className="logs-level-select"
                    options={logLevelOptions}
                    value={camelCase(logLevel)}
                    onSelect={level => setConfig(c => { c.logLevel = level })}
                    maxHeight={300}
                />
                <Select
                    className="logs-filter-select"
                    options={ipOptions}
                    value={selectedIP}
                    onSelect={setSelectedIP}
                    maxHeight={300}
                />
                <SearchInput
                    className="logs-search-input"
                    value={searchKeyword}
                    placeholder={t('searchPlaceholder') as string}
                    onSearch={setSearchKeyword}
                    onClear={() => setSearchKeyword('')}
                    storageKey="logs-search-history"
                />
            </Header>

            <Card className="flex flex-col flex-1 mt-2.5 md:mt-4">
                <ul className="logs-panel" ref={listRef}>
                    {
                        filteredLogs.map((log, index) => {
                            const logTime = log.time || new Date()
                            const payload = log.payload || ''
                            const logType = log.type || 'unknown'
                            const logKey = `${logTime.getTime()}-${payload.substring(0, 50)}-${index}`
                            
                            return (
                                <li className="leading-5 inline-block" key={logKey}>
                                    <span className="mr-2 text-orange-400">[{ dayjs(logTime).format('YYYY-MM-DD HH:mm:ss') }]</span>
                                    <span className={logMap.get(logType) || ''}>[{ logType.toUpperCase() }]</span>
                                    <span> { payload }</span>
                                </li>
                            )
                        })
                    }
                </ul>
            </Card>
        </div>
    )
}
