interface GridFrameProps {
  className?: string
}

export function GridFrame({ className = '' }: GridFrameProps) {
  const frameUrl = `${import.meta.env.BASE_URL}frame-dark.svg`
  return (
    <div
      className={`grid3d-frame absolute w-full h-full ${className}`}
      style={{
        backgroundImage: `url('${frameUrl}')`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
      }}
      aria-hidden
    />
  )
}
