"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  children: React.ReactNode;
  /** Custom refresh logic. If not provided, defaults to window.location.reload() */
  onRefresh?: () => Promise<void>;
}

const THRESHOLD = 80;
const MAX_PULL = 150;

export function PullToRefresh({ children, onRefresh }: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const startY = useRef(0);
  const currentY = useRef(0);
  const isAtTop = useRef(true);

  // Check mobile screen width
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Track scroll position to ensure we only pull at the top
  useEffect(() => {
    const handleScroll = () => {
      isAtTop.current = window.scrollY <= 0;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    // Initial check
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Use passive: false for touchmove to prevent default scrolling when pulling
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isMobile) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshing || !isAtTop.current) return;
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshing || !isAtTop.current) return;
      
      currentY.current = e.touches[0].clientY;
      const deltaY = currentY.current - startY.current;

      // Only handle pull down, not push up
      if (deltaY > 0) {
        // Prevent scroll
        if (e.cancelable) e.preventDefault();
        
        // Add resistance
        const resistance = Math.min(deltaY * 0.4, MAX_PULL);
        setPullDistance(resistance);
      } else {
        // Moved up, cancel pull
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling || isRefreshing) return;
      setIsPulling(false);

      // Check if threshold met
      if (pullDistance >= THRESHOLD) {
        setIsRefreshing(true);
        setPullDistance(THRESHOLD); // Snap to threshold
        
        // Haptic feedback if supported
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(50);
        }

        if (onRefresh) {
          try {
            await onRefresh();
          } finally {
            setIsRefreshing(false);
            setPullDistance(0);
          }
        } else {
          // Fallback: reload page
          window.location.reload();
        }
      } else {
        // Not enough pull, reset
        setPullDistance(0);
      }
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });
    container.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [isMobile, isPulling, isRefreshing, pullDistance, onRefresh]);

  if (!isMobile) {
    return <>{children}</>;
  }

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const rotateDeg = progress * 180;

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Pull Indicator Loader */}
      <div 
        className="absolute left-0 w-full flex justify-center z-50 pointer-events-none transition-transform"
        style={{
          top: "-50px", // Hidden above the container initially
          transform: `translateY(${pullDistance}px)`,
          transitionDuration: isPulling ? "0ms" : "300ms",
          opacity: pullDistance > 0 || isRefreshing ? 1 : 0
        }}
      >
        <div className="bg-white dark:bg-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.15)] rounded-full h-10 w-10 flex items-center justify-center border border-slate-200/50 dark:border-slate-700/50">
          {isRefreshing ? (
            <svg className="animate-spin h-5 w-5 text-violet-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <div 
              className="text-violet-500 flex items-center justify-center transition-transform duration-100"
              style={{
                transform: `rotate(${rotateDeg}deg)`,
                opacity: 0.4 + (progress * 0.6)
              }}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div 
        className="h-full w-full"
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? "none" : "transform 300ms cubic-bezier(0.25, 1, 0.5, 1)"
        }}
      >
        {children}
      </div>
    </div>
  );
}
