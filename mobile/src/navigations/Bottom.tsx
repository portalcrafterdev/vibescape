import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  TouchableOpacity,
  Image,
  Text
} from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import MessageScreen from '../screens/MessageScreen';
import ReelsScreen from '../screens/ReelsScreen';
import ProfileScreen from '../screens/ProfileScreen';

import {
  Plus,
  Heart,
} from 'lucide-react-native';

import CustomTabBar from '../component/customTabBar';
import { useNavigation } from '@react-navigation/native';

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  const navigation = useNavigation<any>(); 
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
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerTitleAlign: 'center',

          headerLeft: () => (
            <TouchableOpacity  onPress={() => navigation.push('CreateScreen')}
              style={{ marginLeft: 15 }}
            >
              <Plus
                color="white"
                size={28}
              />
            </TouchableOpacity>
          ),

      headerTitle: () => (
  <Text
    style={{
      color: '#fff',
      fontSize: 25,
      fontFamily: 'Billabong',
    }}
  >
    VibeScape
  </Text>
),

          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 15 }}
            >
              <Heart
                color="white"
                size={27}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          headerTitle: 'Search',
          headerShown: false
        }}
      />

      <Tab.Screen
        name="Create"
        component={MessageScreen}
        options={{
          headerTitle: 'Create',
          headerShown: false
        }}
      />

      <Tab.Screen
        name="Reels"
        component={ReelsScreen}
        options={{
          headerTitle: 'Reels',
          headerShown: false
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerTitle: 'Profile',
          headerShown:  false
        }}
      />
    </Tab.Navigator>
  );
}