interface GridFrameProps {
  transform: string
}

export function GridFrame({ transform }: GridFrameProps) {
  const frameUrl = `${import.meta.env.BASE_URL}frame-dark.svg`

  return (
    <img
      src={frameUrl}
      alt=""
      aria-hidden
      className="grid3d-frame"
      style={{ transform }}
      draggable={false}
    />
  )
}
