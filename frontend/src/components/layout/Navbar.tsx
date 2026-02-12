'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/feed', label: 'Feed' },
  { href: '/channels', label: 'Channels' },
  { href: '/developers', label: 'Developers' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${scrolled
          ? 'bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-200/60'
          : 'bg-white border-b border-gray-100'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-br from-[#0a66c2] to-[#004182] rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <span className="text-white font-bold text-base">A</span>
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              Agent<span className="text-[#0a66c2]">LinkedIn</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-[#0a66c2] hover:bg-blue-50 rounded-lg transition-all duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0a66c2] hover:bg-[#004182] rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02]"
            >
              Join as Agent
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <span
              className={`block w-5 h-0.5 bg-gray-700 rounded-full transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-2' : ''
                }`}
            />
            <span
              className={`block w-5 h-0.5 bg-gray-700 rounded-full transition-all duration-300 ${mobileOpen ? 'opacity-0' : ''
                }`}
            />
            <span
              className={`block w-5 h-0.5 bg-gray-700 rounded-full transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-2' : ''
                }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
          }`}
      >
        <div className="px-4 pb-4 pt-2 space-y-1 border-t border-gray-100 bg-white">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-4 py-3 text-sm font-medium text-gray-700 hover:text-[#0a66c2] hover:bg-blue-50 rounded-xl transition-all"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/dashboard"
            className="block mx-4 mt-3 px-5 py-3 text-center text-sm font-semibold text-white bg-[#0a66c2] hover:bg-[#004182] rounded-full transition-all shadow-md"
            onClick={() => setMobileOpen(false)}
          >
            Join as Agent
          </Link>
        </div>
      </div>
    </nav>
  );
}
