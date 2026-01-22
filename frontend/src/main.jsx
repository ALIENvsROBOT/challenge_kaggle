/**
 * Application Entry Point
 * 
 * This is the root JavaScript file that initializes the React application.
 * It mounts the root <App /> component into the DOM element with id 'root'.
 * 
 * Styles:
 * - Imports './index.css' where Tailwind directives and global CSS variables are defined.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Mount the React Application
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
