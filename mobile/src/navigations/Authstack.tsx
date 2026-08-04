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
import SettingsScreen from '../screens/Setting';
import CreateScreen from '../screens/CreateScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import FollowListScreen from '../screens/FollowListScreen';
import StoryViewer from '../screens/StoryViewer';
import CommentsScreen from '../screens/CommentsScreen';
import ReelViewerScreen from '../screens/ReelViewerScreen';
import ChatScreen from '../screens/ChatScreen';

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
    
    <Screen
    name='SettingsScreen'
    component= { SettingsScreen}/>

    <Screen
    name='CreateScreen'
    component= {CreateScreen}/>

    <Screen
    name='UserProfile'
    component= {UserProfileScreen}/>

    <Screen
    name='FollowList'
    component= {FollowListScreen}/>

    <Screen
    name='StoryViewer'
    component= {StoryViewer}/>

    <Screen
    name='ReelViewer'
    component= {ReelViewerScreen}/>

    <Screen
    name='Chat'
    component= {ChatScreen}/>

    {/* A see through sheet so the reel or the post stays visible behind it. */}
    <Screen
    name='Comments'
    component= {CommentsScreen}
    options={{
      presentation: 'transparentModal',
      animation: 'slide_from_bottom',
      contentStyle: { backgroundColor: 'transparent' },
    }}/>

    </Navigator>

    
  );
};

export default AuthStack;