import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { CurrencyPill, PlayerAvatar } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';

interface Conversation {
  id: string;
  name: string;
  emoji: string;
  preview: string;
  time: string;
  unread: boolean;
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
];

interface ChatMessage {
  id: string;
  sender: 'them' | 'me';
  text: string;
}

const SAMPLE_THREAD: Record<string, ChatMessage[]> = {
  viktor: [
    { id: '1', sender: 'them', text: 'The stage is set for the Grandmaster invitational. Have you refined your end-game sequences?' },
    { id: '2', sender: 'me', text: 'Locked and loaded. Just finished a simulation against the Alpha-8 engine. My mid-game sacrifice is now airtight.' },
    { id: '3', sender: 'them', text: "Impressive. The roar of the digital crowd is going to be deafening tonight. Don't let the pyrotechnics distract you." },
    { id: '4', sender: 'them', text: "It's about the performance, not just the points." },
  ],
  luna: [
    { id: '1', sender: 'them', text: 'The crowd loved the final gambit move!' },
  ],
};

export default function MessagesScreen() {
  const router = useRouter();
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [extraMessages, setExtraMessages] = useState<Record<string, ChatMessage[]>>({});

  const openConversation = CONVERSATIONS.find((c) => c.id === openConversationId) ?? null;

  function handleBack() {
    if (openConversationId) {
      setOpenConversationId(null);
      setDraft('');
    } else {
      router.back();
    }
  }

  function handleSend() {
    if (!openConversationId || !draft.trim()) return;
    const newMessage: ChatMessage = { id: `local-${Date.now()}`, sender: 'me', text: draft.trim() };
    setExtraMessages((prev) => ({
      ...prev,
      [openConversationId]: [...(prev[openConversationId] ?? []), newMessage],
    }));
    console.log('Message sent', newMessage.text);
    setDraft('');
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{openConversation ? openConversation.name : 'Messages'}</Text>
        <CurrencyPill type="gems" value={1_400} />
      </View>

      {openConversation ? (
        <ChatView
          conversation={openConversation}
          messages={[...(SAMPLE_THREAD[openConversation.id] ?? []), ...(extraMessages[openConversation.id] ?? [])]}
          draft={draft}
          onDraftChange={setDraft}
          onSend={handleSend}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>Active Sessions</Text>
          <View style={styles.list}>
            {CONVERSATIONS.map((conversation) => (
              <Pressable
                key={conversation.id}
                style={[styles.conversationCard, conversation.unread && styles.conversationCardUnread]}
                onPress={() => {
                  console.log('Opened conversation', conversation.name);
                  setOpenConversationId(conversation.id);
                }}
              >
                {conversation.unread ? <View style={styles.unreadBar} /> : null}
                <PlayerAvatar emoji={conversation.emoji} size="medium" />
                <View style={styles.conversationInfo}>
                  <View style={styles.conversationTopRow}>
                    <Text style={[styles.conversationName, !conversation.unread && styles.conversationNameRead]}>
                      {conversation.name}
                    </Text>
                    <Text style={styles.conversationTime}>{conversation.time}</Text>
                  </View>
                  <Text style={styles.conversationPreview} numberOfLines={1}>
                    {conversation.preview}
                  </Text>
                </View>
                {conversation.unread ? <View style={styles.unreadDot} /> : null}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function ChatView({
  conversation,
  messages,
  draft,
  onDraftChange,
  onSend,
}: {
  conversation: Conversation;
  messages: ChatMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <View style={styles.chatRoot}>
      <ScrollView contentContainerStyle={styles.chatScrollContent} showsVerticalScrollIndicator={false}>
        {messages.map((message) => (
          <View
            key={message.id}
            style={[styles.bubbleWrap, message.sender === 'me' ? styles.bubbleWrapMe : styles.bubbleWrapThem]}
          >
            <Text style={[styles.bubbleSender, message.sender === 'me' && styles.bubbleSenderMe]}>
              {message.sender === 'me' ? 'You' : conversation.name}
            </Text>
            <View style={[styles.bubble, message.sender === 'me' ? styles.bubbleMe : styles.bubbleThem]}>
              <Text style={styles.bubbleText}>{message.text}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.composerRow}>
        <Pressable style={styles.composerIconButton} onPress={() => console.log('Attach pressed')}>
          <MaterialCommunityIcons name="plus" size={20} color={Colors.cyan} />
        </Pressable>
        <TextInput
          value={draft}
          onChangeText={onDraftChange}
          placeholder="Prepare your next move..."
          placeholderTextColor={Colors.textMuted}
          style={styles.composerInput}
        />
        <Pressable style={styles.sendButton} onPress={onSend}>
          <MaterialCommunityIcons name="send" size={18} color={Colors.bgBase} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bgBase,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(Colors.bgPanel, 0.8),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.4),
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: 15,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 60,
  },
  sectionLabel: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
  },
  list: {
    gap: Spacing.sm,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: withOpacity(Colors.bgPanel, 0.6),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.2),
    overflow: 'hidden',
  },
  conversationCardUnread: {
    backgroundColor: withOpacity(Colors.bgPanel, 0.85),
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: Colors.emberLight,
    boxShadow: `0px 0px 10px ${withOpacity(Colors.emberLight, 0.6)}`,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  conversationName: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
  },
  conversationNameRead: {
    color: Colors.textMuted,
  },
  conversationTime: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textMuted,
  },
  conversationPreview: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.emberLight,
    boxShadow: `0px 0px 8px ${withOpacity(Colors.emberLight, 0.6)}`,
  },
  chatRoot: {
    flex: 1,
  },
  chatScrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  bubbleWrap: {
    maxWidth: '85%',
    gap: 4,
  },
  bubbleWrapThem: {
    alignSelf: 'flex-start',
  },
  bubbleWrapMe: {
    alignSelf: 'flex-end',
  },
  bubbleSender: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    paddingHorizontal: Spacing.sm,
  },
  bubbleSenderMe: {
    color: Colors.emberLight,
    textAlign: 'right',
  },
  bubble: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  bubbleThem: {
    backgroundColor: withOpacity(Colors.bgPanel, 0.85),
    borderColor: withOpacity(Colors.chromeDark, 0.3),
    borderTopLeftRadius: 4,
  },
  bubbleMe: {
    backgroundColor: withOpacity(Colors.emberLight, 0.16),
    borderColor: withOpacity(Colors.emberLight, 0.4),
    borderTopRightRadius: 4,
  },
  bubbleText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: withOpacity(Colors.chromeDark, 0.3),
    backgroundColor: withOpacity(Colors.bgPanel, 0.9),
  },
  composerIconButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(Colors.bgBase, 0.5),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.3),
  },
  composerInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: withOpacity(Colors.bgBase, 0.6),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.4),
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cyan,
    boxShadow: `0px 0px 14px ${withOpacity(Colors.cyan, 0.4)}`,
  },
});
