import { ref } from "vue";
import api from "@/libs/axios";

// Chat composable for buyer <-> merchant conversations
export function useChat() {
  const conversations = ref([]);
  const messages = ref([]);
  const activeConversation = ref(null);
  const loading = ref(false);

  // Fetch all conversations for authenticated user (used by merchant)
  async function fetchConversations(params = {}) {
    loading.value = true;
    try {
      const { data } = await api.get("/api/chats", { params });
      conversations.value = data.data || data;
      return conversations.value;
    } finally {
      loading.value = false;
    }
  }

  // Load a specific conversation with all messages
  async function loadConversation(conversationId) {
    loading.value = true;
    try {
      console.log('useChat: Loading conversation', conversationId);
      const { data } = await api.get(`/api/chats/${conversationId}`);
      console.log('useChat: Response received', data);
      const payload = data.data || data;
      activeConversation.value = payload.conversation || payload;
      messages.value = payload.messages || [];
      console.log('useChat: activeConversation set to', activeConversation.value);
      return { conversation: activeConversation.value, messages: messages.value };
    } catch (err) {
      console.error('useChat: Error loading conversation', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Start a new conversation as a buyer (by jasa_id)
  async function startConversation(jasaId) {
    loading.value = true;
    try {
      console.log('useChat: Starting conversation with jasa', jasaId);
      const { data } = await api.post(`/api/chats/start`, { jasa_id: jasaId });
      console.log('useChat: Start response received', data);
      const payload = data.data || data;
      activeConversation.value = payload.conversation || payload;
      messages.value = payload.messages || [];
      console.log('useChat: activeConversation set to', activeConversation.value);
      return activeConversation.value;
    } catch (err) {
      console.error('useChat: Error starting conversation', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Send a message to a conversation (works for both buyer and merchant)
  async function sendMessage(conversationId, body, senderRole = null) {
    // Determine sender role - if explicitly passed, use it; otherwise check who's the buyer/merchant
    let role = senderRole;
    
    // If not explicitly specified and we have an active conversation, determine based on context
    if (!role && activeConversation.value) {
      // This will be determined by the component using this function
      // For now, we'll default to checking if this is called from chat detail (merchant) or chat window (buyer)
      role = 'merchant'; // default
    }

    // Use buyer endpoint if this is from a buyer, merchant endpoint otherwise
    const endpoint = role === 'buyer' 
      ? `/api/chats/${conversationId}/buyer-messages`
      : `/api/chats/${conversationId}/messages`;

    const { data } = await api.post(endpoint, { body });
    const msg = data.data || data;
    if (messages.value) {
      messages.value.push(msg);
    }
    return msg;
  }

  // Make a price offer for a conversation (merchant only)
  async function makeOffer(conversationId, price, note = "") {
    const { data } = await api.post(`/api/chats/${conversationId}/offer`, {
      price,
      note: note || null,
    });
    return data.data || data;
  }

  // Accept an offer on a conversation (merchant only)
  async function acceptOffer(conversationId) {
    const { data } = await api.put(`/api/chats/${conversationId}/offer/accept`);
    if (activeConversation.value) {
      activeConversation.value.status = 'deal_accepted';
    }
    return data.data || data;
  }

  // Update conversation status (merchant only)
  async function updateConversationStatus(conversationId, status) {
    const { data } = await api.put(`/api/chats/${conversationId}/status`, { status });
    if (activeConversation.value) {
      activeConversation.value.status = status;
    }
    return data.data || data;
  }

  // Delete/archive a conversation
  async function deleteConversation(conversationId) {
    const { data } = await api.delete(`/api/chats/${conversationId}`);
    conversations.value = conversations.value.filter(c => c.id !== conversationId);
    return data;
  }

  return {
    conversations,
    messages,
    activeConversation,
    loading,
    fetchConversations,
    loadConversation,
    startConversation,
    sendMessage,
    makeOffer,
    acceptOffer,
    updateConversationStatus,
    deleteConversation,
  };
}

