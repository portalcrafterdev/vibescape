import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../auth/AuthContext';
import { RootStackParamList } from '../types/navigation';

import SplashScreen from '../screens/splash';
import LoginScreen from '../screens/login';
import ForgotScreen from '../screens/Forgot';
import RegisterScreen from '../screens/Register';
import BottomTabs from './Bottom';
import EditProfile from '../screens/EditProfile';
import LinkPage from '../components/Edit_Profile/Linkspage';
import BannerScreen from '../components/Edit_Profile/BannerScreen';
import GenderScreen from '../components/Edit_Profile/GenderScreen';
import ThreadScreen from '../screens/ThreadsScreen';

const { Navigator, Screen } = createNativeStackNavigator<RootStackParamList>();

/**
 * Splits the stack on authentication state rather than navigating between them.
 *
 * Because the two branches never coexist, a signed-out user has no route to a
 * signed-in screen — the screens are not in the navigator at all. Losing the session
 * mid-session swaps the tree and unmounts whatever was on top, so there is no stale
 * authenticated screen left behind.
 */
export default function RootNavigator() {
  const { isHydrating, user } = useAuth();

  // Reading the stored session takes a moment. Showing Splash until it resolves
  // avoids a flash of the login screen for someone who is already signed in.
  if (isHydrating) {
    return (
      <Navigator screenOptions={{ headerShown: false }}>
        <Screen name="Splash" component={SplashScreen} />
      </Navigator>
    );
  }

  return (
    <Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Screen name="Maintabs" component={BottomTabs} />
          <Screen name="EditProfile" component={EditProfile} />
          <Screen name="LinkPage" component={LinkPage} />
          <Screen name="BannerScreen" component={BannerScreen} />
          <Screen name="GenderScreen" component={GenderScreen} />
          <Screen name="ThreadsScreen" component={ThreadScreen} />
        </>
      ) : (
        <>
          <Screen name="Login" component={LoginScreen} />
          <Screen name="Register" component={RegisterScreen} />
          <Screen name="Forgot" component={ForgotScreen} />
        </>
      )}
    </Navigator>
  );
}
