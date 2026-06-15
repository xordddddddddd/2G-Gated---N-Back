interface GridFrameProps {
  style: React.CSSProperties
}

export function GridFrame({ style }: GridFrameProps) {
  const frameUrl = `${import.meta.env.BASE_URL}frame-dark.svg`

  return (
    <div
      className="grid3d-frame"
      style={{
        ...style,
        backgroundImage: `url('${frameUrl}')`,
      }}
      aria-hidden
    />
  )
}
