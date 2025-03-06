import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  return (
    <header className='fixed top-0 z-40 w-full border-b bg-background'>
      <div className='container flex h-16 items-center justify-between px-4'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' className='md:hidden' onClick={onMenuClick}>
            <Menu className='h-6 w-6' />
          </Button>
          <div className='flex items-center gap-2'>
            <div className='rounded-md bg-primary p-1'>
              <div className='h-6 w-6 rounded-md bg-primary text-primary-foreground'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  className='h-6 w-6 p-0.5'>
                  <path d='M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5' />
                  <path d='M9 18h6' />
                  <path d='M10 22h4' />
                </svg>
              </div>
            </div>
            <span className='text-xl font-bold'>Vision Match</span>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <ThemeToggle />
          <Button variant='ghost' size='sm' className='hidden md:inline-flex'>
            帮助
          </Button>
        </div>
      </div>
    </header>
  );
}
