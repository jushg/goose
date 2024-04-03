import {
  Alignment,
  Button,
  Classes,
  Drawer,
  FocusStyleManager,
  Icon,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  NavbarHeading,
} from '@blueprintjs/core';
import { IconName, IconNames } from '@blueprintjs/icons';
import classNames from 'classnames';
import { useCallback, useMemo, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import classes from 'src/styles/NavigationBar.module.scss';

import Dropdown from '../dropdown/Dropdown';
import NotificationBadge from '../notificationBadge/NotificationBadge';
import { filterNotificationsByType } from '../notificationBadge/NotificationBadgeHelper';
import Constants from '../utils/Constants';
import { useResponsive, useSession } from '../utils/Hooks';
import AcademyNavigationBar from './subcomponents/AcademyNavigationBar';
import NavigationBarLangSelectButton from './subcomponents/NavigationBarLangSelectButton';
import SicpNavigationBar from './subcomponents/SicpNavigationBar';

export type NavbarEntryInfo = {
  to: string;
  icon: IconName;
  text: string;
  disabled?: boolean; // entry is not rendered when disabled
  hasNotifications?: boolean; // whether to render NotificationBadge
  hiddenInBreakpoints?: ('xs' | 'sm' | 'md' | 'lg')[]; // hide text in Blueprint breakpoints
};

type CreateNavlinkFunction = (navbarEntry: NavbarEntryInfo) => React.ReactElement;

const NavigationBar: React.FC = () => {
  const [mobileSideMenuOpen, setMobileSideMenuOpen] = useState(false);
  const { isMobileBreakpoint } = useResponsive();
  const location = useLocation();
  const {
    isEnrolledInACourse,
    courseId,
    courseShortName,
    assessmentConfigurations
  } = useSession();
  const assessmentTypes = useMemo(
    () => assessmentConfigurations?.map(c => c.type),
    [assessmentConfigurations]
  );

  FocusStyleManager.onlyShowFocusOnTabs();

  const createMobileNavlink: CreateNavlinkFunction = useCallback(
    navbarEntry => (
      <NavLink
        to={navbarEntry.to}
        className={({ isActive }) =>
          classNames(Classes.BUTTON, Classes.MINIMAL, Classes.LARGE, { [Classes.ACTIVE]: isActive })
        }
        onClick={() => setMobileSideMenuOpen(false)}
        key={navbarEntry.text}
      >
        <Icon icon={navbarEntry.icon} />
        <div>{navbarEntry.text}</div>
        {navbarEntry.hasNotifications && (
          <NotificationBadge
            notificationFilter={filterNotificationsByType(navbarEntry.text)}
            disableHover={true}
          />
        )}
      </NavLink>
    ),
    [setMobileSideMenuOpen]
  );

  const wrapWithMobileHamburger = (navlinks: (React.ReactElement | null)[]) => {
    // Don't render drawer when there are 0 navlinks in it
    const nonNullNavlinks = navlinks.filter(e => e !== null);
    const renderDrawer = nonNullNavlinks.length > 0;

    return (
      <NavbarGroup align={Alignment.LEFT}>
        {renderDrawer && (
          <Button
            onClick={() => setMobileSideMenuOpen(!mobileSideMenuOpen)}
            icon={IconNames.MENU}
            large={true}
            minimal={true}
          />
        )}
        <NavLink
          className={classNames('NavigationBar__link', Classes.BUTTON, Classes.MINIMAL)}
          to={
            Constants.playgroundOnly ? '/' : courseId == null ? '/welcome' : `/courses/${courseId}`
          }
        >
          <Icon icon={IconNames.SYMBOL_DIAMOND} />
          <NavbarHeading style={{ paddingBottom: '0px' }}>
            {courseShortName || Constants.sourceAcademyDeploymentName}
          </NavbarHeading>
        </NavLink>
        {renderDrawer && (
          <Drawer
            isOpen={mobileSideMenuOpen}
            position="left"
            onClose={() => setMobileSideMenuOpen(false)}
            title=""
            className={Classes.DARK}
            style={{ overflowY: 'auto' }}
          >
            {navlinks}
          </Drawer>
        )}
      </NavbarGroup>
    );
  };

  const renderPlaygroundOnlyNavbarLeftDesktop = () => (
    <NavbarGroup align={Alignment.LEFT}>
      {renderNavlinksFromInfo(playgroundOnlyNavbarLeftInfo, createDesktopNavlink)}
    </NavbarGroup>
  );

  const renderPlaygroundOnlyNavbarLeftMobile = () =>
    wrapWithMobileHamburger(
      renderNavlinksFromInfo(playgroundOnlyNavbarLeftInfo, createMobileNavlink)
    );


  const commonNavbarRight = (
    <NavbarGroup align={Alignment.RIGHT}>
      {location.pathname.startsWith('/playground') && <NavigationBarLangSelectButton />}
      <NavLink
        className={({ isActive }) =>
          classNames('NavigationBar__link', Classes.BUTTON, Classes.MINIMAL, {
            [Classes.ACTIVE]: isActive
          })
        }
        to="/contributors"
      >
        <Icon icon={IconNames.HEART} />
      </NavLink>

      <div className="visible-xs">
        <NavbarDivider className="thin-divider" />
      </div>
      <div className="hidden-xs">
        <NavbarDivider className="default-divider" />
      </div>

      <Dropdown />
    </NavbarGroup>
  );

  return (
    <>
      <Navbar
        className={classNames(
          'NavigationBar',
          'primary-navbar',
          classes['primary-navbar'],
          Classes.DARK
        )}
      >
        { isMobileBreakpoint
            ? renderPlaygroundOnlyNavbarLeftMobile()
            : renderPlaygroundOnlyNavbarLeftDesktop()
        }
        {commonNavbarRight}
      </Navbar>

      <Routes>
        <Route path="/playground" element={null} />
        <Route path="/githubassessments/*" element={null} />
        <Route path="/contributors" element={null} />
        <Route path="/courses/:courseId/sourcecast" element={null} />
        <Route path="/courses/:courseId/achievements" element={null} />
        <Route path="/sicpjs/:section?" element={<SicpNavigationBar />} />
        <Route
          path="*"
          element={
            !Constants.playgroundOnly && isEnrolledInACourse && !isMobileBreakpoint ? (
              <AcademyNavigationBar assessmentTypes={assessmentTypes} />
            ) : null
          }
        />
      </Routes>
    </>
  );
};

const playgroundOnlyNavbarLeftInfo: NavbarEntryInfo[] = [
  {
    to: '/playground',
    icon: IconNames.CODE,
    text: 'Playground'
  }
];

export const renderNavlinksFromInfo = (
  navbarEntries: NavbarEntryInfo[],
  createNavlink: CreateNavlinkFunction
): (React.ReactElement | null)[] =>
  navbarEntries.map(entry => {
    if (entry.disabled) {
      return null;
    }

    return createNavlink(entry);
  });

export const createDesktopNavlink: CreateNavlinkFunction = navbarEntry => (
  <NavLink
    className={({ isActive }) =>
      classNames(Classes.BUTTON, Classes.MINIMAL, {
        [Classes.ACTIVE]: isActive
      })
    }
    to={navbarEntry.to}
    key={navbarEntry.text}
    title={navbarEntry.text}
  >
    <Icon icon={navbarEntry.icon} />
    <div className={classNames(navbarEntry.hiddenInBreakpoints?.map(bp => `hidden-${bp}`))}>
      {navbarEntry.text}
    </div>
    {navbarEntry.hasNotifications && (
      <NotificationBadge
        notificationFilter={filterNotificationsByType(navbarEntry.text)}
        disableHover={true}
      />
    )}
  </NavLink>
);

export default NavigationBar;
