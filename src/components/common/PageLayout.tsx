interface Props {
  header: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
}

export default function PageLayout({ header, footer, children }: Props) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {header}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
      {footer && (
        <div className="shrink-0">
          {footer}
        </div>
      )}
    </div>
  )
}
