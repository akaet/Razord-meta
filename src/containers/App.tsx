import classnames from 'classnames'
import { useEffect, useRef } from 'react'
import { Route, Navigate, Routes, useLocation, Outlet } from 'react-router-dom'

// import Overview from '@containers/Overview'
import Connections from '@containers/Connections'
import ExternalControllerModal from '@containers/ExternalControllerDrawer'
import Logs from '@containers/Logs'
import Proxies from '@containers/Proxies'
import Rules from '@containers/Rules'
import Settings from '@containers/Settings'
import SideBar from '@containers/Sidebar'
import { useDocumentVisibility } from '@lib/hook'
import { isClashX } from '@lib/jsBridge'
import { useLogsStreamReader, useProxy, useProxyProviders } from '@stores'

import '../styles/common.scss'
import '../styles/iconfont.scss'

export default function App () {
    useLogsStreamReader()

    const location = useLocation()
    const documentVisibility = useDocumentVisibility()
    const { update: updateProxies } = useProxy()
    const { update: updateProxyProviders } = useProxyProviders()
    const previousVisibility = useRef<DocumentVisibilityState>()

    // 当页面从隐藏变为可见时，刷新代理数据
    useEffect(() => {
        // 只在从隐藏变为可见时刷新，避免初始挂载时的不必要刷新
        if (previousVisibility.current !== undefined && previousVisibility.current !== 'visible' && documentVisibility === 'visible') {
            updateProxies()
            updateProxyProviders()
        }
        previousVisibility.current = documentVisibility
    }, [documentVisibility, updateProxies, updateProxyProviders])

    const routes = [
    // { path: '/', name: 'Overview', component: Overview, exact: true },
        { path: '/proxies', name: 'Proxies', element: <Proxies /> },
        { path: '/logs', name: 'Logs', element: <Logs /> },
        { path: '/connections', name: 'Connections', element: <Connections />, noMobile: false },
        { path: '/rules', name: 'Rules', element: <Rules />, noMobile: false },
        { path: '/settings', name: 'Settings', element: <Settings /> },
    ]

    const layout = (
        <div className={classnames('app', { 'not-clashx': !isClashX() })}>
            <SideBar routes={routes} />
            <div className="page-container">
                <Outlet />
            </div>
            <ExternalControllerModal />
        </div>
    )

    return (
        <Routes>
            <Route path="/" element={layout}>
                <Route path="/" element={<Navigate to={{ pathname: '/proxies', search: location.search }} replace />} />
                {
                    routes.map(
                        route => <Route path={route.path} key={route.path} element={route.element} />,
                    )
                }
            </Route>
        </Routes>
    )
}
