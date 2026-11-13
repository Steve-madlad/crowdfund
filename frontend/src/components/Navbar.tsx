import { logo, menu, search } from '@/assets';
import { navlinks } from '@/lib/constants';
import cn from '@/lib/utils';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useConnect, useConnection, useConnectors } from 'wagmi';
import { Icon } from './Sidebar';
import Button from './ui/Button';

export default function Navbar() {
  const [activeLink, setActiveLink] = useState<string>('/');
  const [toggleDrawer, setToggleDrawer] = useState<boolean>(false);
  const navigate = useNavigate();

  const { address, isConnected } = useConnection();
  console.log(isConnected);
  const {
    mutate: connectWallet,
    isPending: connectionLoading,
    error: connectionError,
    isSuccess: connectionSuccess,
  } = useConnect();
  const connectors = useConnectors();

  return (
    <div className="mb-8.75 flex flex-col-reverse justify-between gap-6 sm:mt-6 md:flex-row lg:mt-2">
      <div className="mx-4 flex h-13 flex-row rounded-full bg-[#1c1c24] py-2 pr-2 pl-4 md:max-w-md lg:mx-0 lg:flex-1">
        <input
          type="text"
          className="font-epilogue flex w-full bg-transparent text-sm font-normal text-white outline-none placeholder:text-[#4b5264]"
          placeholder="Search for campaigns"
        />
        <div className="flex-center curosr h-full w-18 rounded-full bg-[#4acd8d]">
          <img src={search} alt="search" className="size-3.75 object-contain" />
        </div>
      </div>

      <div className="hidden justify-end gap-4 sm:flex">
        <Button
          type="button"
          onClick={() => {
            if (isConnected) navigate('create-campaign');
            else connectWallet({ connector: connectors[0] });
          }}
          className={address ? 'bg-[#1dc071]' : 'bg-[#866dfd]'}
        >
          {isConnected ? 'Create a campaign' : 'Connect'}
        </Button>

        <Link
          className="flex-center cursor size-13 overflow-hidden rounded-md bg-[#2c2f32] duration-100 active:scale-90"
          to="/profile"
        >
          <img
            src={`https://api.dicebear.com/10.x/bottts-neutral/svg?seed=${isConnected ? address : 'user'}&backgroundColor=${isConnected ? '4acd8d' : '866dfd'}`}
            alt="avatar"
            className="object-contain"
          />
        </Link>
      </div>

      {/* Small Screen Menu */}
      <div className="flex-between relative sm:hidden!">
        <div className="flex-between relative z-20 w-full overflow-hidden bg-[#13131a] p-4">
          <div className="flex-center cursor size-10 overflow-hidden rounded-md bg-[#2c2f32]">
            <Link to="/">
              <Icon className="size-13 bg-[#2c2f32]" imgUrl={logo} />
            </Link>
          </div>
          <div className="flex-center gap-5">
            <Link
              className="flex-center cursor size-9.5 overflow-hidden rounded-md bg-[#2c2f32]"
              to="/profile"
            >
              <img
                src={`https://api.dicebear.com/10.x/bottts-neutral/svg?seed=${isConnected ? address : 'user'}&backgroundColor=${isConnected ? '4acd8d' : '866dfd'}`}
                alt="avatar"
                className="object-contain"
              />
            </Link>
            <button onClick={() => setToggleDrawer(!toggleDrawer)}>
              <img src={menu} alt="menu" className="cursor size-8 object-contain" />
            </button>
          </div>
        </div>

        <div
          className={`shadow-secondary ${!toggleDrawer ? 'translate-y-[-100vh]' : 'translate-y-3.5'} absolute top-15 right-0 left-0 z-10 rounded-md bg-[#1c1c24] duration-700`}
        >
          <ul className="mb-4">
            {navlinks.map((link) => (
              <li
                className={`flex ${activeLink === link.name && 'bg-[#3a3a43]'} cursor p-4`}
                key={link.name}
                onClick={() => {
                  setToggleDrawer(false);
                  setActiveLink(link.name);
                  navigate(link.link);
                }}
              >
                <img
                  src={link.imgUrl}
                  alt={link.name}
                  className={`object-contain ${activeLink === link.name ? 'grayscale-0' : 'grayscale'} size-6`}
                />
                <p
                  className={`font-epilogue text-sm: capitalize ${activeLink === link.name ? 'text-[#1dc071]' : 'text-[#808191]'} ml-5 font-semibold`}
                >
                  {link.name}
                </p>
              </li>
            ))}
          </ul>

          <div className="flex-mx-4">
            <Button
              type="button"

              onClick={() => {
                if (isConnected) navigate('create-campaign');
                else connectWallet({ connector: connectors[0] });
              }}
              className={cn(address ? 'bg-[#1dc071]' : 'bg-[#866dfd]', 'w-full')}
            >
              {address ? 'Create a campaign' : 'Connect'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
