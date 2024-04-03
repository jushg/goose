import { Classes, NonIdealState } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import classNames from 'classnames';
import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router';
import { createBrowserRouter } from 'react-router-dom';

import { playgroundOnlyRouterConfig } from '../../routes/routerConfig';
import { getHealth } from '../sagas/RequestsSaga';
import Constants from '../utils/Constants';

/**
 * Application wrapper component which figures out which deployment and set of routes to render.
 *
 * There are 3 main types of deployments as follows:
 * 1. Playground-only (stripped-down backendless version of SA - e.g. https://sourceacademy.org)
 * 2. Full Academy (full SA to be deployed and configured with the backend - e.g. https://sourceacademy.nus.edu.sg)
 * 3. Disabled (disabled SA which only allows `staff` and `admin` accounts to log in - e.g. during examinations)
 */
const ApplicationWrapper: React.FC = () => {

  const [isApiHealthy, setIsApiHealthy] = useState(true);

  useEffect(() => {
    if (Constants.useBackend) {
      getHealth().then(res => setIsApiHealthy(!!res));
    }
  }, []);


  if (!isApiHealthy) {
    return (
      <div className={classNames('NoPage', Classes.DARK)}>
        <NonIdealState
          icon={IconNames.WRENCH}
          title="Under maintenance"
          description="The Source Academy is currently undergoing maintenance. Please try again later."
        />
      </div>
    );
  }

  return <RouterProvider router={createBrowserRouter(playgroundOnlyRouterConfig)} />;
};

export default ApplicationWrapper;
