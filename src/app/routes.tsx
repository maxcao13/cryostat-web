/*
 * Copyright The Cryostat Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as React from 'react';
import { Route, RouteComponentProps, Switch, useLocation } from 'react-router-dom';
import About from './About/About';
import Archives from './Archives/Archives';
import CreateRecording from './CreateRecording/CreateRecording';
import Dashboard from './Dashboard/Dashboard';
import DashboardSolo from './Dashboard/DashboardSolo';
import Events from './Events/Events';
import Login from './Login/Login';
import NotFound from './NotFound/NotFound';
import QuickStarts from './QuickStarts/QuickStartsCatalogPage';
import Recordings from './Recordings/Recordings';
import CreateRule from './Rules/CreateRule';
import RulesTable from './Rules/Rules';
import SecurityPanel from './SecurityPanel/SecurityPanel';
import Settings from './Settings/Settings';
import { DefaultFallBack, ErrorBoundary } from './Shared/Components/ErrorBoundary';
import { FeatureLevel } from './Shared/Services/service.types';
import CreateTarget from './Topology/Actions/CreateTarget';
import Topology from './Topology/Topology';
import { useDocumentTitle } from './utils/hooks/useDocumentTitle';
import { useFeatureLevel } from './utils/hooks/useFeatureLevel';
import { useLogin } from './utils/hooks/useLogin';
import { accessibleRouteChangeHandler } from './utils/utils';

let routeFocusTimer: number;
const OVERVIEW = 'Overview';
const CONSOLE = 'Console';
const navGroups = [OVERVIEW, CONSOLE];

export interface IAppRoute {
  anonymous?: boolean;
  label?: string;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  component: React.ComponentType<RouteComponentProps<any>> | React.ComponentType<any>;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  exact?: boolean;
  path: string;
  title: string;
  description?: string; // non-empty description is used to filter routes for the NotFound page
  navGroup?: string;
  featureLevel?: FeatureLevel;
  children?: IAppRoute[];
}

const routes: IAppRoute[] = [
  {
    component: About,
    exact: true,
    label: 'About',
    path: '/about',
    title: 'About',
    description: 'Get information, help, or support for Cryostat.',
    navGroup: OVERVIEW,
    anonymous: true,
  },
  {
    component: Dashboard,
    exact: true,
    label: 'Dashboard',
    path: '/',
    title: 'Dashboard',
    navGroup: OVERVIEW,
    children: [
      {
        component: DashboardSolo,
        exact: true,
        path: '/d-solo',
        title: 'Dashboard',
      },
    ],
  },
  {
    component: QuickStarts,
    exact: true,
    label: 'Quick Starts',
    path: '/quickstarts',
    title: 'Quick Starts',
    description: 'Get started with Cryostat.',
  },
  {
    component: Topology,
    exact: true,
    label: 'Topology',
    path: '/topology',
    title: 'Topology',
    navGroup: OVERVIEW,
    children: [
      {
        component: CreateTarget,
        exact: true,
        path: '/topology/create-custom-target',
        title: 'Create Custom Target',
      },
    ],
  },
  {
    component: RulesTable,
    exact: true,
    label: 'Automated Rules',
    path: '/rules',
    title: 'Automated Rules',
    description:
      'Create recordings on multiple target JVMs at once using Automated Rules consisting of a name, match expression, template, archival period, and more.',
    navGroup: CONSOLE,
    children: [
      {
        component: CreateRule,
        exact: true,
        path: '/rules/create',
        title: 'Create Automated Rule',
      },
    ],
  },
  {
    component: Recordings,
    exact: true,
    label: 'Recordings',
    path: '/recordings',
    title: 'Recordings',
    description: 'Create, view and archive JFR recordings on single target JVMs.',
    navGroup: CONSOLE,
    children: [
      {
        component: CreateRecording,
        exact: true,
        path: '/recordings/create',
        title: 'Create Recording',
      },
    ],
  },
  {
    component: Archives,
    exact: true,
    label: 'Archives',
    path: '/archives',
    title: 'Archives',
    description:
      'View archived recordings across all target JVMs, as well as upload recordings directly to the archive.',
    navGroup: CONSOLE,
  },
  {
    component: Events,
    exact: true,
    label: 'Events',
    path: '/events',
    title: 'Events',
    description: 'View available JFR event templates and types for target JVMs, as well as upload custom templates.',
    navGroup: CONSOLE,
  },
  {
    component: SecurityPanel,
    exact: true,
    label: 'Security',
    path: '/security',
    title: 'Security',
    description: 'Upload SSL certificates for Cryostat to trust when communicating with target applications.',
    navGroup: CONSOLE,
  },
  {
    anonymous: true,
    component: Settings,
    exact: true,
    path: '/settings',
    title: 'Settings',
    description: 'View or modify Cryostat web-client application settings.',
  },
  {
    anonymous: true,
    component: Login,
    // this is only displayed if the user is not logged in and is the last route matched against the current path, so it will always match
    exact: false,
    path: '/',
    title: 'Cryostat',
    description: 'Log in to Cryostat',
  },
];

const flatten = (routes: IAppRoute[]): IAppRoute[] => {
  const ret: IAppRoute[] = [];
  for (const r of routes) {
    ret.push(r);
    if (r.children) {
      ret.push(...flatten(r.children));
    }
  }
  return ret;
};

// a custom hook for sending focus to the primary content container
// after a view has loaded so that subsequent press of tab key
// sends focus directly to relevant content
const useA11yRouteChange = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    routeFocusTimer = accessibleRouteChangeHandler();
    return () => {
      window.clearTimeout(routeFocusTimer);
    };
  }, [pathname]);
};

const RouteWithTitleUpdates = ({ component: Component, title, path, ...rest }: IAppRoute) => {
  useA11yRouteChange();
  useDocumentTitle(title);

  const renderFallback = React.useCallback((error: Error) => {
    return <DefaultFallBack error={error} />;
  }, []);

  function routeWithTitle(routeProps: RouteComponentProps) {
    return (
      <ErrorBoundary renderFallback={renderFallback}>
        <Component {...rest} {...routeProps} />
      </ErrorBoundary>
    );
  }

  return <Route render={routeWithTitle} path={path} />;
};

const PageNotFound = ({ title }: { title: string }) => {
  useDocumentTitle(title);
  return <Route component={NotFound} />;
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AppRoutesProps {}

const AppRoutes: React.FC<AppRoutesProps> = (_) => {
  const loggedIn = useLogin();
  const activeLevel = useFeatureLevel();

  return (
    <Switch>
      {flatten(routes)
        .filter((r) => (loggedIn ? r.component !== Login : r.anonymous))
        .filter((r) => r.featureLevel === undefined || r.featureLevel >= activeLevel)
        .map(({ path, exact, component, title }, idx) => (
          <RouteWithTitleUpdates path={path} exact={exact} component={component} key={idx} title={title} />
        ))}
      <PageNotFound title="404 Page Not Found" />
    </Switch>
  );
};

export { AppRoutes, routes, navGroups, flatten };
