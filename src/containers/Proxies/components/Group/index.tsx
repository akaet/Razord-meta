import { useAtom } from 'jotai'
import { useMemo } from 'react'

import { Tags, Tag } from '@components'
import { Group as IGroup, Proxies as IProxy } from '@lib/request'
import { useProxy, useConfig, proxyMapping, useClient } from '@stores'

import './style.scss'

interface GroupProps {
    config: IGroup
}

export function Group (props: GroupProps) {
    const { update, markProxySelected } = useProxy()
    const [proxyMap] = useAtom(proxyMapping)
    const { data: Config } = useConfig()
    const client = useClient()
    const { config } = props

    async function handleChangeProxySelected (name: string) {
        const oldNow = props.config.now

        // Only URLTest can have fixed nodes. Clicking a fixed node again will unfix it
        if (props.config.type === 'URLTest' && props.config.fixed === name) {
            // Speed test will automatically unfix the node
            await client.getGroupDelay(props.config.name)
            // Trigger remote update to quickly reflect the unfixed result (will update to the lowest latency node)
            await update()
        } else {
            await client.changeProxySelected(props.config.name, name)
            markProxySelected(props.config.name, name)
            // URLTest click: fix the node
            if (props.config.type === 'URLTest') {
                // Trigger remote update to quickly reflect the fixed result and display the 🔒 icon accurately
                await update()
            }
        }

        if (Config.breakConnections) {
            const proxy = await client.getProxy(props.config.name)
            const newNow = (proxy.data as unknown as IGroup).now

            // After unfixing, the auto-selected node might still be the previously fixed node. If the node hasn't changed, no need to break connections
            if (oldNow !== newNow) {
                const list: string[] = []
                const snapshot = await client.getConnections()
                for (const connection of snapshot.data.connections) {
                    if (connection.chains.includes(props.config.name)) {
                        list.push(connection.id)
                    }
                }

                await Promise.all(list.map(id => client.closeConnection(id)))
            }
        }
    }

    const errSet = useMemo(() => {
        const set = new Set<string>()
        for (const proxy of config.all) {
            const history = proxyMap.get(proxy)?.history
            if (history?.length && history.slice(-1)[0].delay === 0) {
                set.add(proxy)
            }
        }

        return set
    }, [config.all, proxyMap])

    const canClick = config.type === 'Selector' || config.type === 'URLTest'
    return (
        <div className="proxy-group">
            <div className="flex h-10 mt-4 w-full items-center justify-between md:(h-15 mt-0 w-auto) ">
                <span className="h-6 px-5 w-35 overflow-hidden overflow-ellipsis whitespace-nowrap md:w-30">{ config.name }</span>
                <Tag className="mr-5 md:mr-0">{ config.type }</Tag>
            </div>
            <div className="flex-1 py-2 md:py-4">
                <Tags
                    className="ml-5 md:ml-8"
                    data={config.all}
                    onClick={handleChangeProxySelected}
                    errSet={errSet}
                    select={config.now}
                    canClick={canClick}
                    rowHeight={30}
                    fixed={config.fixed} />
            </div>
        </div>
    )
}
