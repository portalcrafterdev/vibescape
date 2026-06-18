import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  TouchableOpacity,
  Image,
  Text
} from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import CreateScreen from '../screens/CreateScreen';
import ReelsScreen from '../screens/ReelsScreen';
import ProfileScreen from '../screens/ProfileScreen';

import {
  Plus,
  Heart,
} from 'lucide-react-native';

import CustomTabBar from '../component/customTabBar';

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        tabBarShowLabel: false,

        headerStyle: {
          backgroundColor: '#000',
        },

        headerTintColor: '#fff',

        headerShadowVisible: false,
    

        sceneStyle: {
          backgroundColor: '#000',