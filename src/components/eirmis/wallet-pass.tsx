import React from 'react'
import { CalendarIcon, DownloadIcon, MapPinIcon, QrCodeIcon, ShieldCheckIcon, UserIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface WalletPassProps {
  eventName?: string
  eventDate?: string
  eventLocation?: string
  attendeeName?: string
  ticketTier?: string
  ticketCode?: string
  qrCodeUrl?: string
  onDownload?: () => void
  onAddToWallet?: () => void
  className?: string
}

export function WalletPass({
  eventName = 'Global Tech Innovation Summit 2026',
  eventDate = 'October 24, 2026 • 09:00 AM PST',
  eventLocation = 'Moscone Center, San Francisco, CA',
  attendeeName = 'Alex Rivera',
  ticketTier = 'VIP Delegate',
  ticketCode = 'TKT-8942-EIRMIS',
  onDownload,
  onAddToWallet,
  className,
}: WalletPassProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8',
        className
      )}
    >
      {/* Background glow and subtle patterns */}
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-teal-500/10 blur-3xl" />

      {/* Header with Brand & Tier */}
      <div className="relative flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/30 text-indigo-300 ring-1 ring-indigo-400/30">
            <ShieldCheckIcon className="size-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
            EIRMIS Pass
          </span>
        </div>
        <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-200 ring-1 ring-indigo-400/30">
          {ticketTier}
        </span>
      </div>

      {/* Event Details */}
      <div className="relative mt-4 space-y-1">
        <h3 className="text-lg font-bold tracking-tight text-white sm:text-xl">
          {eventName}
        </h3>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
          <span className="flex items-center gap-1.5">
            <CalendarIcon className="size-3.5 text-indigo-400" />
            {eventDate}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPinIcon className="size-3.5 text-teal-400" />
            {eventLocation}
          </span>
        </div>
      </div>

      {/* Center QR Section */}
      <div className="relative my-6 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xs sm:flex-row sm:justify-between sm:gap-6">
        <div className="flex flex-col items-center sm:items-start">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Pass Holder
          </span>
          <span className="flex items-center gap-2 text-base font-bold text-white">
            <UserIcon className="size-4 text-indigo-300" />
            {attendeeName}
          </span>
          <span className="mt-1 font-mono text-xs text-indigo-300">
            {ticketCode}
          </span>
        </div>

        <div className="mt-4 flex flex-col items-center sm:mt-0">
          <div className="flex size-24 items-center justify-center rounded-xl bg-white p-2 shadow-inner">
            {/* High fidelity QR Placeholder with SVG */}
            <div className="flex size-full items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-800">
              <QrCodeIcon className="size-14 text-slate-800" />
            </div>
          </div>
          <span className="mt-1 text-[10px] font-mono text-slate-400">
            Scan at terminal
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="relative flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          onClick={onAddToWallet}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 transition-all hover:bg-slate-100 active:scale-[0.99]"
        >
          <span> Add to Apple Wallet</span>
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-white/20 active:scale-[0.99]"
        >
          <DownloadIcon className="size-3.5" />
          <span>Save PDF</span>
        </button>
      </div>
    </div>
  )
}
