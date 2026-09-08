import { createRoot } from 'react-dom/client'
import './skin.css'
import App from './App.jsx'

// No StrictMode: its double-invoked mount would build a second Tone.js graph
// and leave the first one running.
createRoot(document.getElementById('root')).render(<App />)
