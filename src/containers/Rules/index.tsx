import { useState, useMemo } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { VariableSizeList as List } from 'react-window'
import useSWR from 'swr'

import { Header, Card, SearchInput } from '@components'
import { useI18n, useRule, useRuleProviders } from '@stores'

import { Provider } from './Provider'
import './style.scss'

export default function Rules () {
    const { rules, update } = useRule()
    const { providers } = useRuleProviders()
    const { translation } = useI18n()
    const { t } = translation('Rules')

    useSWR('rules', update)

    // 搜索功能
    const [searchKeyword, setSearchKeyword] = useState('')
    const filteredRules = useMemo(() => {
        if (!searchKeyword.trim()) return rules

        const keyword = searchKeyword.toLowerCase().trim()
        return rules.filter(rule => {
            return (
                rule.type?.toLowerCase().includes(keyword) ||
                rule.payload?.toLowerCase().includes(keyword) ||
                rule.proxy?.toLowerCase().includes(keyword)
            )
        })
    }, [rules, searchKeyword])

    function handleSearch (keyword: string) {
        setSearchKeyword(keyword)
    }

    const providerCount = providers.length
    const itemCount = providerCount + filteredRules.length

    const getItemSize = (index: number) => {
        if (index < providerCount) return window.innerWidth <= 768 ? 100 : 50
        return 40
    }

    function renderItem ({ index, style }: { index: number, style: React.CSSProperties }) {
        if (index < providerCount) {
            return (
                <div style={style}>
                    <Provider provider={providers[index]} />
                </div>
            )
        }
        const rule = filteredRules[index - providerCount]
        const ruleSize = rule.size || -1
        return (
            <li className="rule-item" style={style}>
                <div className="flex py-1">
                    <div className="text-left w-40 rule-type">{ rule.type }</div>
                    <div className="flex-1 text-center payload"> { ruleSize !== -1 ? `${rule.payload} :: ${ruleSize}` : rule.payload }</div>
                    <div className="text-right w-40 rule-proxy">{ rule.proxy }</div>
                </div>
            </li>
        )
    }

    return (
        <div className="page">
            <Header title={t('title')}>
                <SearchInput
                    className="rules-search"
                    value={searchKeyword}
                    placeholder={t('searchPlaceholder')}
                    onSearch={handleSearch}
                    onClear={() => handleSearch('')}
                    storageKey="rules-search-history"
                    minWidth="200px"
                />
            </Header>
            <Card className="flex flex-col flex-1 mt-2.5 p-0 md:mt-4 focus:outline-none text-sm">
                <AutoSizer className="min-h-120">
                    {
                        ({ height, width }) => (
                            <List
                                height={height}
                                width={width}
                                itemCount={itemCount}
                                itemSize={getItemSize}
                            >
                                { renderItem }
                            </List>
                        )
                    }
                </AutoSizer>
            </Card>
        </div>
    )
}
