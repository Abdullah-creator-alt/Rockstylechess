import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SubPageHeader } from '@/components/layout'
import { AppIcon, CurrencyPill, PlayerAvatar, ScreenBackdrop, SectionLabel } from '@/components/ui'
import { ScreenArt } from '@/constants/screenArt'
import { Colors, withOpacity } from '@/constants/theme'
import { usePlayerProfile } from '@/hooks/usePlayerProfile'

interface Conversation {
  id: string
  name: string
  emoji: string
  preview: string
  time: string
  unread: boolean
}

const CONVERSATIONS: Conversation[] = [
  {
    id: 'viktor',
    name: "VIKTOR 'THE KING'",
    emoji: '👑',
    preview: 'That Sicilian opening was legendary. Ready for a rematch?',
    time: '2m ago',
    unread: true,
  },
  {
    id: 'luna',
    name: 'LUNA (SYNTH LEAD)',
    emoji: '🎤',
    preview: 'The crowd loved the final gambit move!',
    time: '1h ago',
    unread: false,
  },
]

interface ChatMessage {
  id: string
  sender: 'them' | 'me'
  text: string
}

const SAMPLE_THREAD: Record<string, ChatMessage[]> = {
  viktor: [
    { id: '1', sender: 'them', text: 'The stage is set for the Grandmaster invitational. Have you refined your end-game sequences?' },
    { id: '2', sender: 'me', text: 'Locked and loaded. Just finished a simulation against the Alpha-8 engine. My mid-game sacrifice is now airtight.' },
    { id: '3', sender: 'them', text: "Impressive. The roar of the digital crowd is going to be deafening tonight. Don't let the pyrotechnics distract you." },
    { id: '4', sender: 'them', text: "It's about the performance, not just the points." },
  ],
  luna: [{ id: '1', sender: 'them', text: 'The crowd loved the final gambit move!' }],
}

export default function MessagesScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { gems } = usePlayerProfile()
  const [openConversationId, setOpenConversationId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [extraMessages, setExtraMessages] = useState<Record<string, ChatMessage[]>>({})

  const openConversation = CONVERSATIONS.find((c) => c.id === openConversationId) ?? null

  function handleBack() {
    if (openConversationId) {
      setOpenConversationId(null)
      setDraft('')
    } else {
      router.back()
    }
  }

  function handleSend() {
    if (!openConversationId || !draft.trim()) return
    const newMessage: ChatMessage = { id: `local-${Date.now()}`, sender: 'me', text: draft.trim() }
    setExtraMessages((prev) => ({
      ...prev,
      [openConversationId]: [...(prev[openConversationId] ?? []), newMessage],
    }))
    console.log('Message sent', newMessage.text)
    setDraft('')
  }

  if (openConversation) {
    const messages = [...(SAMPLE_THREAD[openConversation.id] ?? []), ...(extraMessages[openConversation.id] ?? [])]
    return (
      <View className="flex-1 bg-bg-base">
        <ScreenBackdrop source={ScreenArt.messagesLounge} opacity={0.18} />
        <SubPageHeader title={openConversation.name} onBack={handleBack} />

        <ScrollView contentContainerClassName="gap-lg px-lg py-lg" showsVerticalScrollIndicator={false}>
          {messages.map((message) => {
            const isMe = message.sender === 'me'
            return (
              <View key={message.id} className={isMe ? 'items-end self-end' : 'items-start'} style={{ maxWidth: '85%' }}>
                <Text
                  className="mb-xs font-section-header uppercase"
                  style={{ fontSize: 10, color: isMe ? Colors.emberLight : Colors.textMuted, paddingHorizontal: 8 }}
                >
                  {isMe ? 'You' : openConversation.name}
                </Text>
                <View
                  className="rounded-lg p-md"
                  style={
                    isMe
                      ? { backgroundColor: withOpacity(Colors.emberLight, 0.16), borderWidth: 1, borderColor: withOpacity(Colors.emberLight, 0.4), borderTopRightRadius: 4 }
                      : { backgroundColor: withOpacity(Colors.bgPanel, 0.85), borderWidth: 1, borderColor: withOpacity(Colors.chromeDark, 0.3), borderTopLeftRadius: 4 }
                  }
                >
                  <Text className="font-body-base text-text-primary" style={{ fontSize: 14, lineHeight: 20 }}>
                    {message.text}
                  </Text>
                </View>
              </View>
            )
          })}
        </ScrollView>

        <View
          className="flex-row items-center gap-sm p-md"
          style={{ paddingBottom: 12 + insets.bottom, borderTopWidth: 1, borderTopColor: withOpacity(Colors.chromeDark, 0.3), backgroundColor: withOpacity(Colors.bgPanel, 0.9) }}
        >
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-md"
            style={{ backgroundColor: withOpacity(Colors.bgBase, 0.5), borderWidth: 1, borderColor: withOpacity(Colors.chromeDark, 0.3) }}
            onPress={() => console.log('Attach pressed')}
          >
            <AppIcon name="add_circle" size={20} color={Colors.cyan} />
          </Pressable>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Prepare your next move..."
            placeholderTextColor={Colors.textMuted}
            className="flex-1 rounded-md px-md font-body-base text-text-primary"
            style={{ height: 44, backgroundColor: withOpacity(Colors.bgBase, 0.6), borderWidth: 1, borderColor: withOpacity(Colors.chromeDark, 0.4), fontSize: 13 }}
            onSubmitEditing={handleSend}
          />
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-md"
            style={{ backgroundColor: Colors.cyan, boxShadow: `0px 0px 14px ${withOpacity(Colors.cyan, 0.4)}` }}
            onPress={handleSend}
          >
            <AppIcon name="send" size={18} color={Colors.bgBase} />
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-bg-base">
      <SubPageHeader title="Messages" trailing={<CurrencyPill type="gems" value={gems} />} />

      <ScrollView contentContainerClassName="gap-md px-lg py-xl" contentContainerStyle={{ paddingBottom: 60 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <SectionLabel label="Active Sessions" />
        <View className="gap-sm">
          {CONVERSATIONS.map((conversation) => (
            <Pressable
              key={conversation.id}
              className="flex-row items-center gap-md overflow-hidden rounded-lg p-md"
              style={{
                backgroundColor: withOpacity(Colors.bgPanel, conversation.unread ? 0.85 : 0.6),
                borderWidth: 1,
                borderColor: withOpacity(Colors.chromeDark, 0.2),
              }}
              onPress={() => {
                console.log('Opened conversation', conversation.name)
                setOpenConversationId(conversation.id)
              }}
            >
              {conversation.unread ? (
                <View
                  className="absolute bottom-0 left-0 top-0"
                  style={{ width: 4, backgroundColor: Colors.emberLight, boxShadow: `0px 0px 10px ${withOpacity(Colors.emberLight, 0.6)}` }}
                />
              ) : null}
              <PlayerAvatar emoji={conversation.emoji} size="medium" />
              <View className="flex-1">
                <View className="flex-row items-baseline justify-between">
                  <Text
                    className="font-section-header uppercase"
                    style={{ fontSize: 14, color: conversation.unread ? Colors.textPrimary : Colors.textMuted }}
                  >
                    {conversation.name}
                  </Text>
                  <Text className="font-body-sm" style={{ fontSize: 10, color: Colors.textMuted }}>
                    {conversation.time}
                  </Text>
                </View>
                <Text className="mt-xs font-body-sm italic text-text-muted" numberOfLines={1} style={{ fontSize: 12 }}>
                  {conversation.preview}
                </Text>
              </View>
              {conversation.unread ? (
                <View
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: Colors.emberLight, boxShadow: `0px 0px 8px ${withOpacity(Colors.emberLight, 0.6)}` }}
                />
              ) : null}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}
