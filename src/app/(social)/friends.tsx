import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SubPageHeader } from '@/components/layout'
import { AppIcon, CurrencyPill, PlayerAvatar, RockButton, RockCard } from '@/components/ui'
import { Colors, withOpacity } from '@/constants/theme'
import { usePlayerProfile } from '@/hooks/usePlayerProfile'

type FriendStatus = 'online' | 'offline' | 'in-game'

interface Friend {
  id: string
  name: string
  emoji: string
  badge?: string
  status: FriendStatus
  meta: string
}

const FRIENDS: Friend[] = [
  { id: 'echo-knight', name: 'ECHO_KNIGHT', emoji: '⚔️', badge: 'GM', status: 'online', meta: 'Rating: 2450' },
  { id: 'void-strategist', name: 'VOID_STRATEGIST', emoji: '🎮', badge: 'M', status: 'online', meta: 'Rating: 2180' },
  { id: 'zen-master-7', name: 'ZEN_MASTER_7', emoji: '🗿', status: 'offline', meta: 'Last seen 2h ago' },
  { id: 'ember-king', name: 'EMBER_KING', emoji: '🔥', status: 'in-game', meta: 'Blitz • 5:00' },
]

const STATUS_DOT_COLOR: Record<FriendStatus, string> = {
  online: Colors.cyan,
  offline: Colors.chromeDark,
  'in-game': Colors.emberLight,
}

type FriendsTab = 'all' | 'recent'

export default function FriendsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { gems } = usePlayerProfile()
  const [activeTab, setActiveTab] = useState<FriendsTab>('all')

  return (
    <View className="flex-1 bg-bg-base">
      <SubPageHeader title="Friends" trailing={<CurrencyPill type="gems" value={gems} />} />

      <ScrollView contentContainerClassName="gap-lg px-lg py-xl" contentContainerStyle={{ paddingBottom: 60 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {/* Entry point into the private-room ("play a friend") flow -- from
            new_ui's friends.tsx; Home's bento grid no longer carries it. */}
        <RockButton
          label="Private Game Room"
          variant="cyan"
          icon={<AppIcon name="meeting_room" size={18} color={Colors.bgBase} />}
          onPress={() => router.push('/game-room')}
        />

        <View className="flex-row gap-sm">
          <View
            className="flex-1 flex-row items-center gap-sm rounded-md px-md"
            style={{ height: 48, backgroundColor: withOpacity(Colors.bgPanel, 0.85), borderWidth: 1, borderColor: withOpacity(Colors.chromeDark, 0.4) }}
          >
            <AppIcon name="search" size={18} color={Colors.textMuted} />
            <TextInput
              placeholder="Search friends by ID or rank..."
              placeholderTextColor={Colors.textMuted}
              className="flex-1 font-body-base text-text-primary"
              style={{ fontSize: 13 }}
            />
          </View>
          <Pressable
            className="items-center justify-center rounded-md"
            style={{ width: 48, height: 48, backgroundColor: Colors.cyan, boxShadow: `0px 0px 14px ${withOpacity(Colors.cyan, 0.4)}` }}
            onPress={() => console.log('Add friend pressed')}
          >
            <MaterialCommunityIcons name="account-plus" size={22} color={Colors.bgBase} />
          </Pressable>
        </View>

        <View className="flex-row gap-sm">
          <Pressable
            className="flex-1 flex-row items-center justify-center gap-xs rounded-md py-sm"
            style={{
              backgroundColor: activeTab === 'all' ? withOpacity(Colors.cyan, 0.14) : withOpacity(Colors.bgPanel, 0.6),
              borderWidth: 1,
              borderColor: activeTab === 'all' ? withOpacity(Colors.cyan, 0.4) : withOpacity(Colors.chromeDark, 0.3),
            }}
            onPress={() => setActiveTab('all')}
          >
            <AppIcon name="group" size={14} color={activeTab === 'all' ? Colors.cyan : Colors.textMuted} />
            <Text className="font-section-header uppercase" style={{ fontSize: 11, color: activeTab === 'all' ? Colors.cyan : Colors.textMuted }}>
              All Friends (24)
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 flex-row items-center justify-center gap-xs rounded-md py-sm"
            style={{
              backgroundColor: activeTab === 'recent' ? withOpacity(Colors.cyan, 0.14) : withOpacity(Colors.bgPanel, 0.6),
              borderWidth: 1,
              borderColor: activeTab === 'recent' ? withOpacity(Colors.cyan, 0.4) : withOpacity(Colors.chromeDark, 0.3),
            }}
            onPress={() => setActiveTab('recent')}
          >
            <AppIcon name="bolt" size={14} color={activeTab === 'recent' ? Colors.cyan : Colors.textMuted} />
            <Text className="font-section-header uppercase" style={{ fontSize: 11, color: activeTab === 'recent' ? Colors.cyan : Colors.textMuted }}>
              Recent (5)
            </Text>
          </Pressable>
        </View>

        <View className="gap-sm">
          {FRIENDS.map((friend) => {
            const offline = friend.status === 'offline'
            return (
              <RockCard key={friend.id} style={offline ? { opacity: 0.7 } : undefined}>
                <View className="flex-row items-center gap-md">
                  <View style={{ position: 'relative' }}>
                    <PlayerAvatar emoji={friend.emoji} size="medium" />
                    <View
                      style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        width: 14,
                        height: 14,
                        borderRadius: 7,
                        borderWidth: 2,
                        borderColor: Colors.bgBase,
                        backgroundColor: STATUS_DOT_COLOR[friend.status],
                      }}
                    />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-xs">
                      <Text className="font-section-header" style={{ fontSize: 14, color: offline ? Colors.textMuted : Colors.textPrimary }}>
                        {friend.name}
                      </Text>
                      {friend.badge ? (
                        <View className="rounded-sm px-xs" style={{ backgroundColor: withOpacity(Colors.emberLight, 0.15) }}>
                          <Text className="font-section-header" style={{ fontSize: 9, color: Colors.emberLight }}>
                            {friend.badge}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className="mt-xs font-body-sm" style={{ fontSize: 11, color: Colors.textMuted }}>
                      {friend.meta}
                    </Text>
                  </View>
                  <View className="items-end gap-xs">
                    {friend.status === 'offline' ? (
                      <View
                        className="rounded-sm px-md py-xs"
                        style={{ backgroundColor: withOpacity(Colors.chromeDark, 0.2), borderWidth: 1, borderColor: withOpacity(Colors.chromeDark, 0.4) }}
                      >
                        <Text className="font-section-header uppercase" style={{ fontSize: 11, color: Colors.textMuted }}>
                          Offline
                        </Text>
                      </View>
                    ) : friend.status === 'in-game' ? (
                      <Pressable
                        className="flex-row items-center gap-xs rounded-sm px-md py-xs"
                        style={{ backgroundColor: withOpacity(Colors.bgPanel, 0.9), borderWidth: 1, borderColor: withOpacity(Colors.cyan, 0.4) }}
                        onPress={() => {
                          console.log('Watch pressed', friend.name)
                          router.push('/front-row')
                        }}
                      >
                        <AppIcon name="visibility" size={14} color={Colors.cyan} />
                        <Text className="font-section-header uppercase" style={{ fontSize: 11, color: Colors.cyan }}>
                          Watch
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        className="rounded-sm px-md py-xs"
                        style={{ backgroundColor: Colors.cyan, boxShadow: `0px 0px 10px ${withOpacity(Colors.cyan, 0.4)}` }}
                        onPress={() => console.log('Challenge pressed', friend.name)}
                      >
                        <Text className="font-section-header uppercase" style={{ fontSize: 11, color: Colors.bgBase }}>
                          Challenge
                        </Text>
                      </Pressable>
                    )}
                    <Pressable
                      className="h-8 w-8 items-center justify-center rounded-sm"
                      style={{ backgroundColor: withOpacity(Colors.bgPanel, 0.9), borderWidth: 1, borderColor: withOpacity(Colors.chromeDark, 0.4) }}
                      onPress={() => {
                        console.log('Chat pressed', friend.name)
                        router.push('/messages')
                      }}
                    >
                      <AppIcon name="chat" size={14} color={Colors.textPrimary} />
                    </Pressable>
                  </View>
                </View>
              </RockCard>
            )
          })}
        </View>

        <RockCard>
          <View className="gap-md">
            <Text className="font-display-hero text-display-hero uppercase text-cyan" style={{ fontSize: 18, textAlign: 'center' }}>
              Forge New Rivalries
            </Text>
            <View className="flex-row items-center justify-between gap-sm">
              <View className="flex-shrink flex-row items-center gap-md">
                <View
                  className="h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: withOpacity(Colors.cyan, 0.12), borderWidth: 1, borderColor: withOpacity(Colors.cyan, 0.3) }}
                >
                  <AppIcon name="share" size={22} color={Colors.cyan} />
                </View>
                <View>
                  <Text className="font-section-header" style={{ fontSize: 13, color: Colors.textPrimary }}>
                    Share Profile Link
                  </Text>
                  <Text className="mt-xs font-body-sm" style={{ fontSize: 11, color: Colors.textMuted }}>
                    Earn 50 gems for each referral
                  </Text>
                </View>
              </View>
              <Pressable
                className="h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: withOpacity(Colors.bgPanel, 0.9), borderWidth: 1, borderColor: withOpacity(Colors.chromeDark, 0.4) }}
                onPress={() => console.log('Copy referral link pressed')}
              >
                <AppIcon name="content_copy" size={18} color={Colors.cyan} />
              </Pressable>
            </View>
          </View>
        </RockCard>
      </ScrollView>
    </View>
  )
}
