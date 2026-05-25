import React, { Profiler } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import splashscreen from '../screens/Splash';
import LoginScreen from '../screens/login';
import ForgotScreen from '../screens/Forgot'
import RegisterScreen from '../screens/Register';
import { RootStackParamList } from '../types/navigation';
import BottomTabs from './Bottom';
import EditProfile from '../screens/EditProfile';

const {Navigator , Screen} = createNativeStackNavigator<RootStackParamList>();

const AuthStack = () => {
  return (
    <Navigator screenOptions={{ headerShown: false }}>
      <Screen
        name="Splash"
        component={splashscreen}
      />

      <Screen
        name="Login"
        component={LoginScreen}
      />