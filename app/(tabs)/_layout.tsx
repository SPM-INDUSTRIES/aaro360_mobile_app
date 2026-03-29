import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { rs, rf, screen } from '../../src/utils/responsive'
import { Theme } from '../../src/styles/theme'

const TAB_BAR_HEIGHT = screen.height > 700 ? 65 : screen.height > 600 ? 55 : 50

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Theme.colors.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: Theme.colors.white,
          borderTopColor: 'rgba(0,0,0,0.05)',
          borderTopWidth: 1,
          height: TAB_BAR_HEIGHT,
          paddingBottom: rs(12),
          paddingTop: rs(8),
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: rf(10),
          fontWeight: '700',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="home" size={rs(24)} color={color} />,
          tabBarLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="search" size={rs(24)} color={color} />,
          tabBarLabel: 'Explore',
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="receipt" size={rs(24)} color={color} />,
          tabBarLabel: 'Orders',
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="cart" size={rs(24)} color={color} />,
          tabBarLabel: 'Cart',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
    </Tabs>
  )
}
