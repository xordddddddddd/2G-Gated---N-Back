import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Ensure 3D grid CSS loads (bypasses Tailwind; must not be bundled)
const grid3dHref = `${import.meta.env.BASE_URL}grid3d.css`
if (!document.querySelector(`link[href="${grid3dHref}"]`)) {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = grid3dHref
  document.head.appendChild(link)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
