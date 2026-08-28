import {
  Lock,
  Star,
  Grid2x2,
  Ban,
  EyeOff,
  Users,
} from "lucide-react-native";

export const privacyData = [
  {
    id: "1",
    title: "Account privacy",
    value: "Private",
    icon: Lock,
    screen: "AccountPrivacy",
  },
  {
    id: "2",
    title: "Close Friends",
    value: "9",
    icon: Star,
    screen: "CloseFriends",
  },
  {
    id: "3",
    title: "Crossposting",
    value: "",
    icon: Grid2x2,
    screen: "Crossposting",
  },
  {
    id: "4",
    title: "Blocked",
    value: "12",
    icon: Ban,
    screen: "Blocked",
  },
  {
    id: "5",
    title: "Story, live and location",
    value: "",
    icon: EyeOff,
    screen: "StoryLocation",
  },
  {
    id: "6",
    title: "Activity in Friends feed",
    value: "",
    icon: Users,
    screen: "FriendsFeed",
  },
];