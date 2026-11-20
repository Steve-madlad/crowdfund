import {
  Bookmark,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  UserRound,
} from 'lucide-react';

export const navlinks = [
  {
    name: 'dashboard',
    icon: LayoutDashboard,
    link: '/',
  },
  {
    name: 'campaign',
    icon: PlusCircle,
    link: '/create-campaign',
  },
  {
    name: 'bookmarks',
    icon: Bookmark,
    link: '/?bookmarked=1',
  },
  {
    name: 'help',
    icon: CircleHelp,
    link: '/help',
  },
  {
    name: 'profile',
    icon: UserRound,
    link: '/profile',
  },
  {
    name: 'logout',
    icon: LogOut,
    link: '/',
  },
];