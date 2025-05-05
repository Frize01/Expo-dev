import { Stack } from "expo-router";

export default function RootLayout() {
    return (
      <Stack screenOptions={option}/>
    );
}

const option = { headerShown: false };