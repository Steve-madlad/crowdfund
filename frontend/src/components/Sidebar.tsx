import { sun } from '@/assets';
import logo from '@/assets/logo.svg';
import { navlinks } from '@/lib/constants';
import cn from '@/lib/utils';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface IconProps {
  imgUrl: string;
  className?: string;
  name?: string;
  activeLink?: string;
  disabled?: boolean;
  handleClick?: () => void;
}

const Icon = ({ imgUrl, className, name, activeLink, disabled, handleClick }: IconProps) => {
  return (
    <div
      className={cn(
        '5 flex-center size-10 rounded-lg',
        activeLink && activeLink === name && 'bg-[#2c2f32]',
        !disabled && 'cursor',
        className,
      )}
      onClick={handleClick}
    >
      <img
        className={`h-1/2 w-1/2 ${activeLink && activeLink !== name && 'grayscale'}`}
        src={imgUrl}
        alt="fund_logo"
      />
    </div>
  );
};

export default function Sidebar() {
  const [isActive, setIsActive] = useState<string>('dashboard');
  const navigate = useNavigate();

  return (
    <div className="col-between sticky top-5 h-[93vh] items-center">
      <Link to="/">
        <Icon className="size-13 bg-[#2c2f32]" imgUrl={logo} />
      </Link>

      <div className="col-between mt-12 w-14 flex-1 items-center rounded-xl bg-[#1c1c24] pt-4 pb-7">
        <div className="col-center gap-3">
          {navlinks.map((link) => (
            <Icon
              {...link}
              key={link.name}
              activeLink={isActive}
              handleClick={() => {
                if (!link.disabled) {
                  setIsActive(link.name);
                  navigate(link.link);
                }
              }}
            />
          ))}
        </div>

        <button className="cursor">
          <img className="size-5.5" src={sun} alt="sun" />
        </button>
      </div>
    </div>
  );
}
