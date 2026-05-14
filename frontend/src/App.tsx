import { AppProviders } from './app/providers/AppProviders'
import { AppRouter } from './app/router/AppRouter'

function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  )
}

export default App
