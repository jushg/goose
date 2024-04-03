import { Navigate, RouteObject } from 'react-router';

import Application from '../commons/application/Application';


/**
 * Partial migration to be compatible with react-router v6.4 data loader APIs.
 *
 * Note that to use data loader APIs, the routes utilizing loader functions must be defined before passing
 * them to createBrowserRouter. They cannot be defined in some child/nested <Routes /> component that can only be known
 * during render time.
 * https://stackoverflow.com/questions/73875903/react-router-route-loader-not-working-on-nested-components
 */

// Conditionally allow access to route via `loader` instead of conditionally defining these routes in react-router v6.4.
// See https://github.com/remix-run/react-router/discussions/10223#discussioncomment-5909050



const GitHubCallback = () => import('../pages/githubCallback/GitHubCallback');
const Playground = () => import('../pages/playground/Playground');
const NotFound = () => import('../pages/notFound/NotFound');


const commonChildrenRoutes: RouteObject[] = [
  {
    path: 'callback/github',
    lazy: GitHubCallback
  }
];

export const playgroundOnlyRouterConfig: RouteObject[] = [
  {
    path: '/*',
    element: <Application />,
    children: [
      {
        path: '',
        element: <Navigate to="/playground" replace />
      },
      {
        path: 'playground',
        lazy: Playground
      },
      ...commonChildrenRoutes,
      {
        path: '*',
        lazy: NotFound
      }
    ]
  }
];

