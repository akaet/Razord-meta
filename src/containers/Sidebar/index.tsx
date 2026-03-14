import classnames from 'classnames'
import { useLayoutEffect, useState, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import logo from '@assets/logo.png'
import iconUpload from '@assets/icon-upload.svg'
import iconDownload from '@assets/icon-download.svg'
import iconMemory from '@assets/icon-memory.svg'
import iconConnection from '@assets/icon-connection.svg'
import { Lang, Language } from '@i18n'
import { formatTraffic } from '@lib/helper'
import * as API from '@lib/request'
import { useI18n, useVersion, useClashXData, useConnectionStreamReader, useTrafficStreamReader } from '@stores'
import { useConnections } from '@containers/Connections/store'
import './style.scss'

interface SidebarProps {
    routes: Array<{
        path: string
        name: string
        noMobile?: boolean
    }>
}

export default function Sidebar (props: SidebarProps) {
    const { routes } = props
    const { translation } = useI18n()
    const { version, premium, meta } = useVersion()
    const { data } = useClashXData()
    const { t } = translation('SideBar')
    const location = useLocation()
    const connStreamReader = useConnectionStreamReader()
    const trafficStreamReader = useTrafficStreamReader()
    const { feed } = useConnections()

    const [stats, setStats] = useState({
        uploadTotal: 0,
        downloadTotal: 0,
        memory: 0,
        connectionCount: 0,
    })

    const [speed, setSpeed] = useState({ uploadSpeed: 0, downloadSpeed: 0 })
    const speedRef = useRef(speed)

    useLayoutEffect(() => {
        function handleConnection (snapshots: API.Snapshot[]) {
            const snapshot = snapshots[snapshots.length - 1]
            if (!snapshot) return
            setStats({
                uploadTotal: snapshot.uploadTotal,
                downloadTotal: snapshot.downloadTotal,
                memory: snapshot.memory,
                connectionCount: snapshot.connections.length,
            })
            feed(snapshot.connections)
        }

        connStreamReader?.subscribe('data', handleConnection)
        return () => {
            connStreamReader?.unsubscribe('data', handleConnection)
        }
    }, [connStreamReader, feed])

    useLayoutEffect(() => {
        function handleTraffic (data: API.Traffic[]) {
            const latest = data[data.length - 1]
            if (latest && (latest.up !== speedRef.current.uploadSpeed || latest.down !== speedRef.current.downloadSpeed)) {
                speedRef.current = { uploadSpeed: latest.up, downloadSpeed: latest.down }
                setSpeed(speedRef.current)
            }
        }

        trafficStreamReader?.subscribe('data', handleTraffic)
        return () => {
            trafficStreamReader?.unsubscribe('data', handleTraffic)
        }
    }, [trafficStreamReader])

    const navlinks = routes.map(
        ({ path, name, noMobile }) => (
            <li className={classnames('item', { 'no-mobile': noMobile })} key={name}>
                <NavLink to={{ pathname: path, search: location.search }} className={({ isActive }) => classnames({ active: isActive })}>
                    { t(name as keyof typeof Language[Lang]['SideBar']) }
                </NavLink>
            </li>
        ),
    )

    return (
        <div className="sidebar">
            <img src={logo} alt="logo" className="sidebar-logo" />
            <ul className="sidebar-menu">
                { navlinks }
            </ul>
            <div className="sidebar-stats">
                <div className="sidebar-stats-group">
                    <div className="sidebar-stats-item">
                        <img src={iconUpload} alt="upload" className="sidebar-stats-icon" />
                        <span className="sidebar-stats-value">{formatTraffic(stats.uploadTotal)}</span>
                    </div>
                    <div className="sidebar-stats-speed">
                        <span className="sidebar-stats-speed-value">
                            {speed.uploadSpeed > 0 ? `↑ ${formatTraffic(speed.uploadSpeed)}/s` : '-'}
                        </span>
                    </div>
                </div>
                <div className="sidebar-stats-group">
                    <div className="sidebar-stats-item">
                        <img src={iconDownload} alt="download" className="sidebar-stats-icon" />
                        <span className="sidebar-stats-value">{formatTraffic(stats.downloadTotal)}</span>
                    </div>
                    <div className="sidebar-stats-speed">
                        <span className="sidebar-stats-speed-value">
                            {speed.downloadSpeed > 0 ? `↓ ${formatTraffic(speed.downloadSpeed)}/s` : '-'}
                        </span>
                    </div>
                </div>
                <div className="sidebar-stats-item">
                    <img src={iconConnection} alt="connection" className="sidebar-stats-icon" />
                    <span className="sidebar-stats-value">{stats.connectionCount}</span>
                </div>
                <div className="sidebar-stats-item">
                    <img src={iconMemory} alt="memory" className="sidebar-stats-icon" />
                    <span className="sidebar-stats-value">{formatTraffic(stats.memory)}</span>
                </div>
            </div>
            <div className="sidebar-version">
                <span className="sidebar-version-label">Clash{ data?.isClashX && 'X' } { t('Version') }</span>
                <span className="sidebar-version-text">{ version }</span>
                { premium && <span className="sidebar-version-label">Premium</span> }
                { meta && <span className="sidebar-version-label">Meta</span> }
            </div>
        </div>
    )
}
