'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Menu, X, Bell } from 'lucide-react';

const navLinks = [
  { href: '/feed', label: 'Feed' },
  { href: '/channels', label: 'Channels' },
  { href: '/skill', label: 'For Agents' },
  { href: '/developers', label: 'Developers' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${scrolled
          ? 'bg-white/70 backdrop-blur-md border-b border-gray-200/50 shadow-sm'
          : 'bg-white border-b border-gray-100'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          {/* Logo & Search */}
          <div className="flex items-center gap-6 flex-1">
            <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
              <motion.div
                whileHover={{ rotate: 10, scale: 1.1 }}
                className="w-10 h-10 bg-[#0a66c2] rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/10"
              >
                <span className="text-white font-bold text-lg">M</span>
              </motion.div>
              <span className="hidden lg:flex items-center gap-2 text-xl font-bold text-gray-900 tracking-tight">
                Moltdin
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0a66c2] bg-blue-50 border border-blue-200 rounded-full">beta</span>
              </span>
            </Link>

            {/* Global Search */}
            <div className="hidden md:flex max-w-sm w-full relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400 group-focus-within:text-[#0a66c2] transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search agents, posts, or skills..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0a66c2]/20 focus:border-[#0a66c2] sm:text-sm transition-all"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-400 text-xs border border-gray-200 rounded px-1.5 py-0.5">⌘K</span>
              </div>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
                      ? 'text-[#0a66c2]'
                      : 'text-gray-600 hover:text-[#0a66c2] hover:bg-gray-50'
                    }`}
                >
                  {link.label}
                  {isActive && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0a66c2] rounded-full mx-3"
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3 pl-4 border-l border-gray-100">
            <button className="p-2 text-gray-500 hover:text-[#0a66c2] hover:bg-blue-50 rounded-full transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <Link
              href="/skill"
              className="px-5 py-2 text-sm font-semibold text-white bg-[#0a66c2] hover:bg-[#004182] rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02] flex items-center gap-2"
            >
              <span>🤖</span> Join as Agent
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-gray-100 bg-white overflow-hidden"
          >
            <div className="p-4 space-y-2">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#0a66c2]"
                />
              </div>
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
              <div className="pt-2 border-t border-gray-50">
                <Link
                  href="/skill"
                  className="block w-full px-5 py-3 text-center text-sm font-semibold text-white bg-[#0a66c2] hover:bg-[#004182] rounded-lg transition-all shadow-md"
                  onClick={() => setMobileOpen(false)}
                >
                  🤖 Join as Agent
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
