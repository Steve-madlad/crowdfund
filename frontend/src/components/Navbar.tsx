import { logo, menu, search } from '@/assets';
import { navlinks } from '@/lib/constants';
import cn from '@/lib/utils';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from './ui/Button';
import { Icon } from './Sidebar';

export default function Navbar() {
  const [address, setAddress] = useState<string>('0x4223');
  const [activeLink, setActiveLink] = useState<string>('/');
  const [toggleDrawer, setToggleDrawer] = useState<boolean>(false);
  const navigate = useNavigate();

  return (
    <div className="mb-8.75 sm:mt-6 lg:mt-2 flex flex-col-reverse justify-between gap-6 md:flex-row">
      <div className="flex h-13 mx-4 lg:mx-0 flex-row rounded-full bg-[#1c1c24] py-2 pr-2 pl-4 md:max-w-md lg:flex-1">
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
          title={address ? 'Create a campaign' : 'Connect'}
          onClick={() => {
            if (address) navigate('create-campaign');
            else 'connect()';
          }}
          className={address ? 'bg-[#1dc071]' : 'bg-[#866dfd]'}
        />

        <Link
          className="flex-center cursor size-13 overflow-hidden rounded-md bg-[#2c2f32] duration-100 active:scale-90"
          to="/profile"
        >
          <img
            src={`https://api.dicebear.com/10.x/bottts-neutral/svg?seed=${address}`}
            alt="avatar"
            className="object-contain"
          />
        </Link>
      </div>

      {/* Small Screen Menu */}
      <div className="flex-between relative sm:hidden!">
        <div className='flex-between w-full relative z-20 overflow-hidden p-4 bg-[#13131a]'>
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
                src={`https://api.dicebear.com/10.x/bottts-neutral/svg?seed=${address}`}
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
                key="link.name"
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
              title={address ? 'Create a campaign' : 'Connect'}
              onClick={() => {
                if (address) navigate('create-campaign');
                else 'connect()';
              }}
              className={cn(address ? 'bg-[#1dc071]' : 'bg-[#866dfd]', 'w-full')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
