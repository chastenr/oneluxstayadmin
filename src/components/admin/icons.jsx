function BaseIcon({ children, className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function DashboardIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M4 5.5h7v5H4z" />
      <path d="M13 5.5h7v13H13z" />
      <path d="M4 12.5h7v6H4z" />
    </BaseIcon>
  )
}

export function ReservationIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M4 8.5h16" />
      <path d="M6 18.5v-10a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10" />
      <path d="M6 14.5h12" />
      <path d="M8.5 11.5v1" />
      <path d="M15.5 11.5v1" />
    </BaseIcon>
  )
}

export function CalendarIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M7 3.5v4" />
      <path d="M17 3.5v4" />
      <path d="M4 8.5h16" />
      <rect x="4" y="5.5" width="16" height="15" rx="2.5" />
      <path d="M8 12.5h3" />
      <path d="M13 12.5h3" />
      <path d="M8 16.5h3" />
      <path d="M13 16.5h3" />
    </BaseIcon>
  )
}

export function PropertyIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M4 20.5h16" />
      <path d="M6 20.5v-11l6-4 6 4v11" />
      <path d="M10 20.5v-5h4v5" />
      <path d="M9 11.5h.01" />
      <path d="M15 11.5h.01" />
    </BaseIcon>
  )
}

export function GuestsIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M16.5 19.5a4.5 4.5 0 0 0-9 0" />
      <circle cx="12" cy="9" r="3" />
      <path d="M20 19.5a3.5 3.5 0 0 0-3-3.46" />
      <path d="M17 5.8a3 3 0 0 1 0 6" />
    </BaseIcon>
  )
}

export function PaymentIcon(props) {
  return (
    <BaseIcon {...props}>
      <rect x="3.5" y="6.5" width="17" height="11" rx="2.5" />
      <path d="M3.5 10.5h17" />
      <path d="M7.5 14.5h4" />
    </BaseIcon>
  )
}

export function DepositIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3.5 5.5 6v5c0 4.2 2.8 8 6.5 9.5 3.7-1.5 6.5-5.3 6.5-9.5V6z" />
      <path d="M9.5 12.5 11 14l3.5-3.5" />
    </BaseIcon>
  )
}

export function OperationsIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="m14 5 5 5" />
      <path d="m12 7 5 5" />
      <path d="M4 20.5 11.5 13" />
      <path d="M6.5 9.5 3.5 6.5l3-3 3 3" />
      <path d="m14.5 12.5 4-4 2 2-4 4" />
    </BaseIcon>
  )
}

export function ReportsIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M5 20.5V9.5" />
      <path d="M12 20.5V5.5" />
      <path d="M19 20.5v-8" />
    </BaseIcon>
  )
}

export function SettingsIcon(props) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.56V21a2 2 0 0 1-4 0v-.08A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1H3a2 2 0 0 1 0-4h.08A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.08A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.64.25 1.26.58 1.56 1H21a2 2 0 0 1 0 4h-.08A1.7 1.7 0 0 0 19.4 15Z" />
    </BaseIcon>
  )
}

export function SearchIcon(props) {
  return (
    <BaseIcon {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20.5-4.2-4.2" />
    </BaseIcon>
  )
}

export function BellIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M6 9.5a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
      <path d="M10 20.5a2.5 2.5 0 0 0 4 0" />
    </BaseIcon>
  )
}

export function ChevronLeftIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="m15 18.5-6-6 6-6" />
    </BaseIcon>
  )
}

export function ChevronRightIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="m9 18.5 6-6-6-6" />
    </BaseIcon>
  )
}

export function MenuIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M4 7.5h16" />
      <path d="M4 12.5h16" />
      <path d="M4 17.5h16" />
    </BaseIcon>
  )
}

export function CloseIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="m6 6.5 12 12" />
      <path d="m18 6.5-12 12" />
    </BaseIcon>
  )
}

export function LogoutIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M14 16.5 19 12l-5-4.5" />
      <path d="M19 12H9" />
      <path d="M10 20.5H6a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2h4" />
    </BaseIcon>
  )
}

export function SparklesIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="m12 3.5 1.8 4.7 4.7 1.8-4.7 1.8-1.8 4.7-1.8-4.7-4.7-1.8 4.7-1.8Z" />
      <path d="m18.5 16.5.8 2 .8-2 2-.8-2-.8-.8-2-.8 2-2 .8Z" />
    </BaseIcon>
  )
}

export function ArrowUpRightIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M7 17.5 17 7.5" />
      <path d="M9 7.5h8v8" />
    </BaseIcon>
  )
}

export function FilterIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M4 6.5h16" />
      <path d="M7 12.5h10" />
      <path d="M10 18.5h4" />
    </BaseIcon>
  )
}

export function AlertIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="m12 4.5 8 14H4z" />
      <path d="M12 10v4" />
      <path d="M12 17.5h.01" />
    </BaseIcon>
  )
}

export function CheckCircleIcon(props) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="m8.5 12 2.3 2.3 4.7-4.8" />
    </BaseIcon>
  )
}

export function ClockIcon(props) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 1.5" />
    </BaseIcon>
  )
}

