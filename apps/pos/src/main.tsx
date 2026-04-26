import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { startFloorBridge } from './lib/floorBridge'

// Sync POS state → web 5174 via backend /api/floor-state
startFloorBridge()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
