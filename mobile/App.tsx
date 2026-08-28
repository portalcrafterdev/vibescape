import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthStack from './src/navigations/Authstack';
import { ProfileProvider } from './src/context/ProfileContext';
import { StoryProvider } from './src/context/StoryContext';

const App = () => {
  return (
    <ProfileProvider>
      {/* Inside the profile, because it needs to know who is signed in. */}
      <StoryProvider>
        <NavigationContainer>
          <AuthStack />
        </NavigationContainer>
      </StoryProvider>
    </ProfileProvider>
  );
};

export default App;
