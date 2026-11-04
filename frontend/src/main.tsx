import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // You need this!
import { AppContextProvider } from './context/AppContext'
import { ToastProvider } from './context/ToastContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter> 
      <ToastProvider>
        <AppContextProvider>
          <App />
        </AppContextProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)