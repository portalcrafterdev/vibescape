import React , {useState, useRef}from 'react';
import {
  FlatList,
  StyleSheet,
  Dimensions,
  StatusBar,
  View,
} from 'react-native';

import ReelCard from '../components/ReelsCard';
import { reels } from '../data/Reels';
import { useIsFocused } from '@react-navigation/native';

const { height } = Dimensions.get('window');

const ReelsScreen = () => {
  const isfocused = useIsFocused();
  const [activeId, setActiveId] = useState(reels[0].id);
  const viewabilityConfig= useRef({ itemVisiblePercentThreshold: 80}).current;
