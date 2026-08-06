import React, { useEffect, useState } from "react";
import { TouchableOpacity, View, FlatList, StyleSheet, Text , Image} from "react-native";

import Plus from "lucide-react-native/icons/plus";

import { getUserHighlights, HighlightOut } from "../../../api/authApi";

interface highlightprops {
  userId?: string;
  // Changes when the screen is refreshed, which loads the highlights again.
  reload?: number;
  // The New circle only belongs on the signed-in user's own profile.
  canAdd?: boolean;
}

const StoryHighlight = ({ userId, reload, canAdd }: highlightprops) => {
  const [items, setItems] = useState<HighlightOut[]>([]);

  useEffect(() => {
    const loadHighlights = async () => {
      if (!userId) return;

      try {
        const response = await getUserHighlights(userId);
        setItems(response);
      } catch (error) {
        console.log("Load highlights failed", error);
      }
    };

    loadHighlights();
  }, [userId, reload]);

  // Someone else with no highlights gets no empty strip.
  if (!canAdd && items.length === 0) return null;

  const renderItem = ({ item }: { item: HighlightOut }) => (
    <View style={styles.item}>
      <TouchableOpacity style={styles.highlightBorder}>
        <Image
          source={
            item.cover_url
              ? { uri: item.cover_url }
              : require("../../assets/images/Portelcrafterlogo.png")
          }
          style={styles.highlightImage}
        />
      </TouchableOpacity>

      <Text
        style={styles.title}
        numberOfLines={1}
      >
        {item.title}
      </Text>
    </View>
  );


return(
 <View style={styles.container}>
    <FlatList
    horizontal
   data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          canAdd ? (
            <View style={styles.item}>
              <TouchableOpacity style={styles.newHighlight}>
                <Plus
                  color="#fff"
                  size={30}
                  strokeWidth={2}
                />
              </TouchableOpacity>

              <Text style={styles.title} numberOfLines={1}>
                New
              </Text>
            </View>
          ) : null
        }
    />
 </View>
);
}
export default StoryHighlight;

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 18,
  },

  content: {
    paddingHorizontal: 16,
  },

  item: {
    alignItems: 'center',
    marginRight: 18,
  },

  highlightBorder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#3a3a3a',
    justifyContent: 'center',
    alignItems: 'center',
  },

  highlightImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#262626',
  },

  newHighlight: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#3a3a3a',
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    marginTop: 8,
    width: 70,
    textAlign: 'center',
  },
});
