import React, { Profiler } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import splashscreen from '../screens/splash';
import LoginScreen from '../screens/login';
import ForgotScreen from '../screens/Forgot'
import RegisterScreen from '../screens/Register';
import { RootStackParamList } from '../types/navigation';
import BottomTabs from './Bottom';
import EditProfile from '../screens/EditProfile';
import LinkPage from '../components/Edit_Profile/Linkspage';
import BannerScreen from '../components/Edit_Profile/BannerScreen';
import GenderScreen from '../components/Edit_Profile/GenderScreen';
import ThreadScreen from '../screens/ThreadsScreen';

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

      <Screen
  name='Forgot'
  component={ForgotScreen}
      />

      <Screen
      name='Register'
      component={RegisterScreen}
      />

    <Screen
    name = 'Maintabs'
    component={BottomTabs}
    />

    <Screen
    name='EditProfile'
    component= { EditProfile}/>

    
    <Screen
    name='LinkPage'
    component= { LinkPage}/>
    
    <Screen
    name='BannerScreen'
    component= { BannerScreen}/>
  
    <Screen
    name='GenderScreen'
    component= { GenderScreen}/>

    <Screen
    name='ThreadsScreen'
    component= { ThreadScreen}/>
    

    
    </Navigator>

    
  );
};

export default AuthStack;