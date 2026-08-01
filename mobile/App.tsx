import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthStack from './src/navigations/Authstack';

const App = () => {
  return (
    <NavigationContainer>
      <AuthStack />
    </NavigationContainer>
  );
};

export default App;