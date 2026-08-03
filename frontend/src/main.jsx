import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { DraftProvider } from './components/commom/draft/DraftContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DraftProvider>
      <App />
    </DraftProvider>
  </React.StrictMode>,
)