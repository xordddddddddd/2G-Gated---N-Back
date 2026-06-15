interface GridFrameProps {
  layerClass: string
}

export function GridFrame({ layerClass }: GridFrameProps) {
  const frameUrl = `${import.meta.env.BASE_URL}frame-dark.svg`

  return (
    <img
      src={frameUrl}
      alt=""
      aria-hidden
      draggable={false}
      className={`grid3d-frame ${layerClass}`}
    />
  )
}
