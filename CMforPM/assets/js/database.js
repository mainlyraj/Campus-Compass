// Database utility for Campus Compass
// Uses localStorage to simulate a database

const DB = {
  // Initialize database with default admin
  init() {
    if (!localStorage.getItem('cc_users')) {
      const defaultUsers = [
        {
          id: 'admin1',
          email: 'admin@campuscompass.edu',
          password: 'admin123', // In production, this should be hashed
          role: 'admin',
          name: 'Admin User',
          createdAt: new Date().toISOString()
        },
        {
          id: 'student1',
          email: 'student@campuscompass.edu',
          password: 'student123',
          role: 'student',
          name: 'Student User',
          createdAt: new Date().toISOString()
        },
        {
          id: 'management1',
          email: 'management@campuscompass.edu',
          password: 'management123',
          role: 'management',
          name: 'Management User',
          createdAt: new Date().toISOString()
        }
      ];
      localStorage.setItem('cc_users', JSON.stringify(defaultUsers));
    }

    if (!localStorage.getItem('cc_items')) {
      localStorage.setItem('cc_items', JSON.stringify([]));
    }

    if (!localStorage.getItem('cc_conversations')) {
      localStorage.setItem('cc_conversations', JSON.stringify([]));
    }

    if (!localStorage.getItem('cc_claims')) {
      localStorage.setItem('cc_claims', JSON.stringify([]));
    }
  },

  // User operations
  getUsers() {
    return JSON.parse(localStorage.getItem('cc_users') || '[]');
  },

  getUserByEmail(email) {
    const users = this.getUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  getUserById(id) {
    const users = this.getUsers();
    return users.find(u => u.id === id);
  },

  addUser(user) {
    const users = this.getUsers();
    const newUser = {
      id: 'user_' + Date.now(),
      email: user.email,
      password: user.password, // In production, hash this
      role: user.role || 'student',
      name: user.name,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    localStorage.setItem('cc_users', JSON.stringify(users));
    return newUser;
  },

  // Item operations
  getItems() {
    return JSON.parse(localStorage.getItem('cc_items') || '[]');
  },

  getItemById(id) {
    const items = this.getItems();
    return items.find(i => i.id === id);
  },

  addItem(item) {
    const items = this.getItems();
    const newItem = {
      id: 'item_' + Date.now(),
      title: item.title,
      description: item.description,
      category: item.category,
      location: item.location,
      image: item.image || null,
      uploadedBy: item.uploadedBy, // user id
      uploadedByName: item.uploadedByName,
      status: 'pending', // pending, open, claimed, resolved
      createdAt: new Date().toISOString()
    };
    items.push(newItem);
    localStorage.setItem('cc_items', JSON.stringify(items));
    return newItem;
  },

  deleteItem(id) {
    const items = this.getItems();
    const filtered = items.filter(i => i.id !== id);
    localStorage.setItem('cc_items', JSON.stringify(filtered));
    return true;
  },

  updateItem(id, updates) {
    const items = this.getItems();
    const index = items.findIndex(i => i.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      localStorage.setItem('cc_items', JSON.stringify(items));
      return items[index];
    }
    return null;
  },

  // Claim operations
  getClaims() {
    return JSON.parse(localStorage.getItem('cc_claims') || '[]');
  },

  getClaimByItemId(itemId) {
    const claims = this.getClaims();
    return claims.find(c => c.itemId === itemId);
  },

  addClaim(claim) {
    const claims = this.getClaims();
    const newClaim = {
      id: 'claim_' + Date.now(),
      itemId: claim.itemId,
      itemTitle: claim.itemTitle,
      claimedBy: claim.claimedBy, // user id
      claimedByName: claim.claimedByName,
      uploadedBy: claim.uploadedBy, // user id
      uploadedByName: claim.uploadedByName,
      status: 'pending', // pending, approved, rejected
      createdAt: new Date().toISOString()
    };
    claims.push(newClaim);
    localStorage.setItem('cc_claims', JSON.stringify(claims));
    
    // Update item status to "under claiming process"
    this.updateItem(claim.itemId, { status: 'under claiming process' });
    
    return newClaim;
  },

  approveClaim(claimId) {
    const claims = this.getClaims();
    const claimIndex = claims.findIndex(c => c.id === claimId);
    
    if (claimIndex !== -1) {
      claims[claimIndex].status = 'approved';
      localStorage.setItem('cc_claims', JSON.stringify(claims));
      
      // Update item status to "claimed" when approved
      this.updateItem(claims[claimIndex].itemId, { status: 'claimed' });
      
      return claims[claimIndex];
    }
    
    return null;
  },

  rejectClaim(claimId) {
    const claims = this.getClaims();
    const claimIndex = claims.findIndex(c => c.id === claimId);
    
    if (claimIndex !== -1) {
      claims[claimIndex].status = 'rejected';
      localStorage.setItem('cc_claims', JSON.stringify(claims));
      
      // Update item status back to "open" when rejected
      this.updateItem(claims[claimIndex].itemId, { status: 'open' });
      
      return claims[claimIndex];
    }
    
    return null;
  },

  // Conversation operations
  getConversations() {
    return JSON.parse(localStorage.getItem('cc_conversations') || '[]');
  },

  getConversationByClaimId(claimId) {
    const conversations = this.getConversations();
    return conversations.find(c => c.claimId === claimId);
  },

  getOrCreateConversation(claimId, itemId, participant1Id, participant1Name, participant2Id, participant2Name) {
    let conversation = this.getConversationByClaimId(claimId);
    
    if (!conversation) {
      const conversations = this.getConversations();
      conversation = {
        id: 'conv_' + Date.now(),
        claimId: claimId,
        itemId: itemId,
        participant1Id: participant1Id,
        participant1Name: participant1Name,
        participant2Id: participant2Id,
        participant2Name: participant2Name,
        messages: [],
        createdAt: new Date().toISOString()
      };
      conversations.push(conversation);
      localStorage.setItem('cc_conversations', JSON.stringify(conversations));
    }
    
    return conversation;
  },

  addMessage(conversationId, senderId, senderName, message) {
    const conversations = this.getConversations();
    const convIndex = conversations.findIndex(c => c.id === conversationId);
    
    if (convIndex !== -1) {
      if (!conversations[convIndex].messages) {
        conversations[convIndex].messages = [];
      }
      
      conversations[convIndex].messages.push({
        id: 'msg_' + Date.now(),
        senderId: senderId,
        senderName: senderName,
        message: message,
        timestamp: new Date().toISOString()
      });
      
      localStorage.setItem('cc_conversations', JSON.stringify(conversations));
      return conversations[convIndex];
    }
    
    return null;
  },

  getConversationById(conversationId) {
    const conversations = this.getConversations();
    return conversations.find(c => c.id === conversationId);
  },

  canAccessConversation(conversationId, userId, userRole) {
    const conversation = this.getConversationById(conversationId);
    if (!conversation) return false;
    
    // Admin and Management can access all conversations
    if (userRole === 'admin' || userRole === 'management') {
      return true;
    }
    
    // Participants can access their own conversations
    return conversation.participant1Id === userId || conversation.participant2Id === userId;
  }
};

// Initialize on load
if (typeof window !== 'undefined') {
  DB.init();
}

