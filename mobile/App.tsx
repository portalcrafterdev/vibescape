import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from './src/auth/AuthContext';
import RootNavigator from './src/navigations/RootNavigator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The API client already recovers from a stale token by refreshing once.
      // Retrying an auth failure on top of that only multiplies requests against a
      // session that is already gone.
      retry: (failureCount, error: any) =>
        failureCount < 2 && error?.status !== 401 && error?.status !== 403,
      staleTime: 30_000,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
