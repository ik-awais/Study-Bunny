import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BunnySleep } from './BunnyElements';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-bunny-card rounded-3xl p-6 shadow-sm border border-bunny-border relative overflow-hidden", className)} {...props}>
    {children}
  </div>
);

export const Button = ({ variant = 'primary', className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' }) => {
  const variants = {
    primary: "bg-bunny-primary text-white shadow-md hover:bg-bunny-primary-hover",
    secondary: "bg-bunny-blush text-bunny-text hover:bg-bunny-rose/50",
    outline: "border-2 border-bunny-border text-bunny-text hover:border-bunny-primary hover:text-bunny-primary",
    ghost: "text-bunny-muted hover:text-bunny-primary hover:bg-bunny-cream"
  };
  return (
    <button className={cn("px-5 py-2.5 rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2", variants[variant], className)} {...props}>
      {children}
    </button>
  );
};

export const ProgressBar = ({ progress, className, indicatorClassName }: { progress: number, className?: string, indicatorClassName?: string }) => (
  <div className={cn("h-3 bg-bunny-border/50 rounded-full overflow-hidden w-full", className)}>
    <div className={cn("h-full bg-bunny-primary rounded-full transition-all duration-500", indicatorClassName)} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
  </div>
);

export const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={cn("px-3 py-1 bg-bunny-border text-bunny-text rounded-full text-xs font-bold uppercase tracking-wider", className)}>
    {children}
  </span>
);

export const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn("w-full px-4 py-2.5 bg-bunny-card border-2 border-bunny-border rounded-xl focus:outline-none focus:border-bunny-primary transition-colors text-sm text-bunny-text placeholder:text-bunny-muted", className)} {...props} />
);

export const Select = ({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cn("w-full px-4 py-2.5 bg-bunny-card border-2 border-bunny-border rounded-xl focus:outline-none focus:border-bunny-primary transition-colors text-sm font-medium appearance-none text-bunny-text", className)} {...props}>{children}</select>
);

export const EmptyState = ({ title, message, action }: { title: string, message: string, action?: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in">
    <BunnySleep className="w-32 h-32 text-bunny-muted mb-6 opacity-60" />
    <h3 className="text-xl font-rounded font-bold text-bunny-text mb-2">{title}</h3>
    <p className="text-bunny-muted max-w-sm mb-6">{message}</p>
    {action}
  </div>
);