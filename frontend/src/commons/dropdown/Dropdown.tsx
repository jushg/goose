import { Menu, MenuItem, Position } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { Popover2 } from '@blueprintjs/popover2';
import React, { useState } from 'react';

import ControlButton from '../ControlButton';
import Profile from '../profile/Profile';
import { useSession } from '../utils/Hooks';
import DropdownAbout from './DropdownAbout';
import DropdownCourses from './DropdownCourses';
import DropdownHelp from './DropdownHelp';
import DropdownSettings from './DropdownSettings';

const Dropdown: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMyCoursesOpen, setIsMyCoursesOpen] = useState(false);

  const { isLoggedIn, name, courses, courseId } = useSession();

  const toggleSettingsOpen = () => {
    setIsSettingsOpen(oldValue => !oldValue);
  };
  const toggleAboutOpen = () => {
    setIsAboutOpen(oldValue => !oldValue);
  };
  const toggleHelpOpen = () => setIsHelpOpen(oldValue => !oldValue);
  const toggleProfileOpen = () => setIsProfileOpen(oldValue => !oldValue);
  const toggleMyCoursesOpen = () => setIsMyCoursesOpen(oldValue => !oldValue);

  const profile =
    isLoggedIn && courseId != null ? (
      // Name is defined when user is logged in
      <MenuItem icon={IconNames.USER} onClick={toggleProfileOpen} text={titleCase(name!)} />
    ) : null;



  const menu = (
    <Menu>
      {profile}
      <MenuItem icon={IconNames.COG} onClick={toggleSettingsOpen} text="Settings" />
      <MenuItem icon={IconNames.HELP} onClick={toggleAboutOpen} text="About" />
      <MenuItem icon={IconNames.ERROR} onClick={toggleHelpOpen} text="Help" />
    </Menu>
  );

  return (
    <>
      <Popover2 content={menu} inheritDarkTheme={false} placement={Position.BOTTOM}>
        <ControlButton icon={IconNames.CARET_DOWN} />
      </Popover2>
      <DropdownSettings isOpen={isSettingsOpen} onClose={toggleSettingsOpen} />
      <DropdownAbout isOpen={isAboutOpen} onClose={toggleAboutOpen} />
      <DropdownHelp isOpen={isHelpOpen} onClose={toggleHelpOpen} />
      {isLoggedIn ? (
        <>
          <DropdownCourses
            isOpen={isMyCoursesOpen}
            onClose={toggleMyCoursesOpen}
            courses={courses}
            courseId={courseId}
          />
          <Profile isOpen={isProfileOpen} onClose={toggleProfileOpen} />
        </>
      ) : null}
    </>
  );
};

const titleCase = (str: string) =>
  str.replace(/\w\S*/g, wrd => wrd.charAt(0).toUpperCase() + wrd.substr(1).toLowerCase());

export default Dropdown;
