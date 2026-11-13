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

export const Icon = ({ imgUrl, className, name, activeLink, disabled, handleClick }: IconProps) => {
  const icon = (
    <img
      className={`h-1/2 w-1/2 ${activeLink && activeLink !== name && 'grayscale'}`}
      src={imgUrl}
      alt={handleClick ? '' : 'Crowdfund home'}
      aria-hidden={Boolean(handleClick)}
    />
  );
  const iconClassName = cn(
    'flex-center size-10 rounded-lg',
    activeLink && activeLink === name && 'bg-secondary',
    handleClick && 'cursor focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
    className,
  );

  if (handleClick) {
    return (
      <button
        type="button"
        className={iconClassName}
        aria-label={name ?? 'Navigation item'}
        aria-current={activeLink === name ? 'page' : undefined}
        disabled={disabled}
        onClick={handleClick}
      >
        {icon}
      </button>
    );
  }

  return <div className={iconClassName}>{icon}</div>;
};

export default function Sidebar() {
  const [isActive, setIsActive] = useState<string>('dashboard');
  const navigate = useNavigate();

  return (
    <div className="col-between sticky top-5 h-[93vh] items-center">
      <Link to="/">
        <Icon className="size-13 bg-secondary" imgUrl={logo} />
      </Link>

      <div className="col-between mt-12 w-14 flex-1 items-center rounded-xl bg-card pt-4 pb-7">
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

        <button
          type="button"
          className="cursor"
          aria-label="Theme switching is coming soon"
          disabled
        >
          <img className="size-5.5" src={sun} alt="" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
