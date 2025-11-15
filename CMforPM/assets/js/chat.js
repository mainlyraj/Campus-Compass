// Chat functionality
(function() {
  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function getCurrentUser() {
    const authData = localStorage.getItem('cc_current_user');
    if (!authData) return null;
    try {
      return JSON.parse(authData);
    } catch {
      return null;
    }
  }

  function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleString();
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Track if user is typing to prevent refresh interruption
  let isUserTyping = false;
  let lastMessageCount = 0;

  function renderChat(conversation, item, user, preserveInput = false) {
    const container = document.getElementById('chat-container');
    const noAccess = document.getElementById('no-access');
    
    if (!container) return;

    // Check access
    if (!DB.canAccessConversation(conversation.id, user.id, user.role)) {
      container.style.display = 'none';
      if (noAccess) noAccess.style.display = 'block';
      return;
    }

    // Preserve input value if refreshing
    const existingInput = document.getElementById('message-input');
    const preservedValue = preserveInput && existingInput ? existingInput.value : '';

    container.style.display = 'grid';
    if (noAccess) noAccess.style.display = 'none';

    const otherParticipant = conversation.participant1Id === user.id 
      ? { id: conversation.participant2Id, name: conversation.participant2Name }
      : { id: conversation.participant1Id, name: conversation.participant1Name };

    const currentMessageCount = (conversation.messages || []).length;
    const shouldScroll = !preserveInput || currentMessageCount > lastMessageCount;
    lastMessageCount = currentMessageCount;

    container.innerHTML = `
      <div class="chat-header">
        <h2>Conversation about: ${escapeHtml(item ? item.title : 'Lost Item')}</h2>
        <p>With: ${escapeHtml(otherParticipant.name)} ${user.role === 'admin' || user.role === 'management' ? '(Admin/Management View)' : ''}</p>
      </div>
      <div class="chat-messages" id="messages-container">
        ${item ? `
          <div class="item-info">
            <strong>Item:</strong> ${escapeHtml(item.title)}<br>
            <strong>Category:</strong> ${escapeHtml(item.category)}<br>
            <strong>Location:</strong> ${escapeHtml(item.location)}<br>
            <strong>Description:</strong> ${escapeHtml(item.description)}
          </div>
        ` : ''}
        ${(conversation.messages || []).map(msg => {
          const isOwn = msg.senderId === user.id;
          return `
            <div class="message ${isOwn ? 'own' : 'other'}">
              <div class="message-header">${escapeHtml(msg.senderName)}</div>
              <div class="message-bubble">${escapeHtml(msg.message)}</div>
              <div class="message-time">${formatTime(msg.timestamp)}</div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="chat-input-area">
        <textarea id="message-input" class="chat-input" rows="2" placeholder="Type your message...">${preservedValue}</textarea>
        <button id="send-btn" class="btn btn-primary">Send</button>
      </div>
    `;

    // Scroll to bottom only if new messages
    if (shouldScroll) {
      const messagesContainer = document.getElementById('messages-container');
      if (messagesContainer) {
        setTimeout(() => {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
      }
    }

    // Restore focus if user was typing
    const messageInput = document.getElementById('message-input');
    if (preserveInput && messageInput && preservedValue) {
      setTimeout(() => {
        messageInput.focus();
        messageInput.setSelectionRange(preservedValue.length, preservedValue.length);
      }, 50);
    }

    // Send message handler
    const sendBtn = document.getElementById('send-btn');
    
    function sendMessage() {
      const message = messageInput?.value.trim();
      if (!message) return;

      isUserTyping = false;
      DB.addMessage(conversation.id, user.id, user.name, message);
      messageInput.value = '';
      
      // Reload chat without preserving input
      loadChat(false);
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', sendMessage);
    }

    if (messageInput) {
      messageInput.addEventListener('input', function() {
        isUserTyping = true;
      });

      messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });

      messageInput.addEventListener('blur', function() {
        // Small delay to check if focus moved to send button
        setTimeout(() => {
          if (document.activeElement !== sendBtn) {
            isUserTyping = false;
          }
        }, 100);
      });
    }
  }

  function loadChat(preserveInput = false) {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    // Get conversation ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get('conversation');

    if (!conversationId) {
      document.getElementById('chat-container').innerHTML = `
        <div class="no-access">
          <h2>No Conversation Selected</h2>
          <p>Please select a conversation from the dashboard.</p>
          <a href="dashboard.html" class="btn btn-primary" style="margin-top: 16px;">Back to Dashboard</a>
        </div>
      `;
      return;
    }

    const conversation = DB.getConversationById(conversationId);
    if (!conversation) {
      document.getElementById('chat-container').innerHTML = `
        <div class="no-access">
          <h2>Conversation Not Found</h2>
          <p>The conversation you're looking for doesn't exist.</p>
          <a href="dashboard.html" class="btn btn-primary" style="margin-top: 16px;">Back to Dashboard</a>
        </div>
      `;
      return;
    }

    // Check access
    if (!DB.canAccessConversation(conversationId, user.id, user.role)) {
      document.getElementById('chat-container').style.display = 'none';
      document.getElementById('no-access').style.display = 'block';
      return;
    }

    const item = DB.getItemById(conversation.itemId);
    renderChat(conversation, item, user, preserveInput);
  }

  // Auto-refresh messages every 5 seconds (only if user is not typing)
  let refreshInterval;
  
  onReady(() => {
    loadChat(false);
    
    // Set up auto-refresh (only refresh if user is not typing)
    refreshInterval = setInterval(() => {
      // Don't refresh if user is currently typing
      if (isUserTyping) {
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const conversationId = urlParams.get('conversation');
      if (conversationId) {
        const user = getCurrentUser();
        if (user) {
          const conversation = DB.getConversationById(conversationId);
          if (conversation && DB.canAccessConversation(conversationId, user.id, user.role)) {
            const item = DB.getItemById(conversation.itemId);
            // Preserve input when auto-refreshing
            renderChat(conversation, item, user, true);
          }
        }
      }
    }, 5000); // Increased to 5 seconds to reduce blinking
  });

  // Clean up interval on page unload
  window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });
})();

