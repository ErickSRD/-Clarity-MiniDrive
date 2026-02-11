import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css';
import './styles/design.css';

const queryClient = new QueryClient()

const root = createRoot(document.getElementById('root')!)
root.render(
	<QueryClientProvider client={queryClient}>
		<App />
	</QueryClientProvider>
)
