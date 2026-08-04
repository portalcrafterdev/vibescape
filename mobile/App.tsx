import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthStack from './src/navigations/Authstack';
import { ProfileProvider } from './src/context/ProfileContext';

const App = () => {
  return (
    <ProfileProvider>
      <NavigationContainer>
        <AuthStack />
      </NavigationContainer>
    </ProfileProvider>
  );
};

export default App;
