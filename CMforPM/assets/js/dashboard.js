// Dashboard functionality
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

  function canDelete() {
    const user = getCurrentUser();
    return user && (user.role === 'admin' || user.role === 'management');
  }

  function formatDate(dateString) {
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
    return date.toLocaleDateString();
  }

  function imageToBase64(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
      callback(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  function renderItems(items) {
    const container = document.getElementById('items-container');
    const noItems = document.getElementById('no-items');
    
    if (!container) return;

    if (items.length === 0) {
      container.style.display = 'none';
      if (noItems) noItems.style.display = 'block';
      return;
    }

    container.style.display = 'grid';
    if (noItems) noItems.style.display = 'none';

    container.innerHTML = items.map(item => {
      const user = getCurrentUser();
      const isOwner = user && user.id === item.uploadedBy;
      const showDelete = canDelete() || isOwner;
      const existingClaim = DB.getClaimByItemId(item.id);
      // Only consider active claims (not rejected) when checking if item can be claimed
      const hasActiveClaim = existingClaim && existingClaim.status !== 'rejected';
      
      // Claim button shows for ALL users except the uploader when item is open or pending and has no active claim
      // Check status with trim and lowercase to handle any case/whitespace issues
      const itemStatus = (item.status || '').toString().trim().toLowerCase();
      // Allow claiming for both 'open' and 'pending' items (pending items can be claimed but will need confirmation)
      const canClaim = user && !isOwner && (itemStatus === 'open' || itemStatus === 'pending') && !hasActiveClaim;
      
      // Debug logging for all items
      if (user) {
        console.log(`[Item Debug] "${item.title}": status="${itemStatus}", userId=${user.id}, itemUploadedBy=${item.uploadedBy}, isOwner=${isOwner}, canClaim=${canClaim}, hasActiveClaim=${hasActiveClaim}`);
      }
      const hasClaim = existingClaim && existingClaim.status !== 'rejected' && (existingClaim.claimedBy === user?.id || existingClaim.uploadedBy === user?.id);
      const conversation = existingClaim && existingClaim.status !== 'rejected' ? DB.getConversationByClaimId(existingClaim.id) : null;
      const canConfirm = isOwner && item.status === 'pending';
      const canApprove = isOwner && item.status === 'under claiming process' && existingClaim && existingClaim.status === 'pending';

      // Status color mapping
      const statusColor = item.status === 'pending' ? '#f59e0b' : 
                         item.status === 'open' ? '#059669' : 
                         item.status === 'under claiming process' ? '#f59e0b' :
                         item.status === 'claimed' ? '#059669' : '#6b7280';
      
      // Format status display
      const statusDisplay = item.status === 'under claiming process' ? 'UNDER CLAIMING PROCESS' : item.status.toUpperCase();

      return `
        <article class="item-card" data-id="${item.id}" data-title="${item.title.toLowerCase()}" data-category="${item.category}" data-location="${item.location}" data-status="${item.status}">
          <div class="item-thumb" style="background: ${item.image ? `url(${item.image}) center/cover` : 'linear-gradient(135deg, #dbeafe, #bfdbfe)'};"></div>
          <div class="item-body">
            <h3 class="item-title">${escapeHtml(item.title)}</h3>
            <p class="item-meta">
              <strong>Category:</strong> ${escapeHtml(item.category)}<br>
              <strong>Location:</strong> ${escapeHtml(item.location)}<br>
              <strong>Status:</strong> <span style="color: ${statusColor}; font-weight: 600;">${statusDisplay}</span><br>
              ${item.status === 'under claiming process' && existingClaim && existingClaim.status !== 'rejected' ? `<strong>Claimed by:</strong> ${escapeHtml(existingClaim.claimedByName)}<br>` : ''}
              <strong>Uploaded by:</strong> ${escapeHtml(item.uploadedByName)}<br>
              <strong>Date:</strong> ${formatDate(item.createdAt)}
            </p>
            <p style="margin: 8px 0; color: var(--text-dim); font-size: 14px;">${escapeHtml(item.description)}</p>
            <div style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;" class="item-actions">
              ${canConfirm ? `<button class="btn btn-sm btn-primary confirm-item" data-id="${item.id}">Confirm Item</button>` : ''}
              ${canClaim ? `<button class="btn btn-sm btn-primary claim-item" data-id="${item.id}" data-title="${escapeHtml(item.title)}" data-uploaded-by="${item.uploadedBy}" data-uploaded-by-name="${escapeHtml(item.uploadedByName)}" style="display: inline-flex !important; visibility: visible !important;">Claim Item</button>` : ''}
              ${canApprove ? `<button class="btn btn-sm btn-primary approve-claim" data-claim-id="${existingClaim.id}" data-item-id="${item.id}">Approve Claim</button>` : ''}
              ${canApprove ? `<button class="btn btn-sm btn-outline reject-claim" data-claim-id="${existingClaim.id}" data-item-id="${item.id}" style="color: #dc2626; border-color: #dc2626;">Reject Claim</button>` : ''}
              ${hasClaim && conversation ? `<a href="chat.html?conversation=${conversation.id}" class="btn btn-sm btn-secondary">View Conversation</a>` : ''}
              ${showDelete ? `<button class="btn btn-sm btn-outline delete-item" data-id="${item.id}" style="color: #dc2626; border-color: #dc2626;">Delete</button>` : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Verify claim buttons were created
    const claimBtnCount = (container.innerHTML.match(/claim-item/g) || []).length;
    console.log(`[Render] Created ${claimBtnCount} claim button(s) in HTML`);

    // Attach delete handlers
    document.querySelectorAll('.delete-item').forEach(btn => {
      btn.addEventListener('click', function() {
        const itemId = this.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this item?')) {
          DB.deleteItem(itemId);
          loadItems();
        }
      });
    });

    // Attach confirm handlers (for uploaders to confirm pending items)
    document.querySelectorAll('.confirm-item').forEach(btn => {
      btn.addEventListener('click', function() {
        const itemId = this.getAttribute('data-id');
        if (confirm('Confirm this item? It will be made available for others to claim.')) {
          DB.updateItem(itemId, { status: 'open' });
          alert('Item confirmed! It is now available for claiming.');
          loadItems();
        }
      });
    });

    // Attach approve claim handlers
    document.querySelectorAll('.approve-claim').forEach(btn => {
      btn.addEventListener('click', function() {
        const claimId = this.getAttribute('data-claim-id');
        const itemId = this.getAttribute('data-item-id');
        if (confirm('Approve this claim? The item will be marked as claimed.')) {
          DB.approveClaim(claimId);
          alert('Claim approved! The item is now marked as claimed.');
          loadItems();
        }
      });
    });

    // Attach reject claim handlers
    document.querySelectorAll('.reject-claim').forEach(btn => {
      btn.addEventListener('click', function() {
        const claimId = this.getAttribute('data-claim-id');
        const itemId = this.getAttribute('data-item-id');
        if (confirm('Reject this claim? The item will be made available for claiming again.')) {
          DB.rejectClaim(claimId);
          alert('Claim rejected! The item is now available for claiming again.');
          loadItems();
        }
      });
    });

    // Attach claim handlers
    const claimButtons = document.querySelectorAll('.claim-item');
    console.log(`[Claim Buttons] Found ${claimButtons.length} claim button(s) in DOM`);
    
    claimButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        const itemId = this.getAttribute('data-id');
        const itemTitle = this.getAttribute('data-title');
        const uploadedBy = this.getAttribute('data-uploaded-by');
        const uploadedByName = this.getAttribute('data-uploaded-by-name');
        const user = getCurrentUser();
        
        if (!user) {
          alert('Please login first');
          return;
        }

        if (confirm(`Are you sure you want to claim "${itemTitle}"? This will start a conversation with ${uploadedByName}.`)) {
          // Create claim
          const claim = DB.addClaim({
            itemId: itemId,
            itemTitle: itemTitle,
            claimedBy: user.id,
            claimedByName: user.name,
            uploadedBy: uploadedBy,
            uploadedByName: uploadedByName
          });

          // Create conversation
          const conversation = DB.getOrCreateConversation(
            claim.id,
            itemId,
            uploadedBy,
            uploadedByName,
            user.id,
            user.name
          );

          // Add initial message
          DB.addMessage(conversation.id, user.id, user.name, 
            `Hello! I would like to claim this item: ${itemTitle}. Can you please verify if this belongs to me?`);

          alert('Claim submitted! A conversation has been started. Redirecting to chat...');
          window.location.href = `chat.html?conversation=${conversation.id}`;
        }
      });
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function loadItems() {
    let items = DB.getItems();
    
    // Apply filters
    const keyword = document.getElementById('search-keyword')?.value.toLowerCase().trim() || '';
    const category = document.getElementById('filter-category')?.value || '';
    const location = document.getElementById('filter-location')?.value || '';
    const status = document.getElementById('filter-status')?.value || '';

    items = items.filter(item => {
      const matchKeyword = !keyword || 
        item.title.toLowerCase().includes(keyword) ||
        item.description.toLowerCase().includes(keyword);
      const matchCategory = !category || item.category === category;
      const matchLocation = !location || item.location === location;
      const matchStatus = !status || item.status === status;
      
      return matchKeyword && matchCategory && matchLocation && matchStatus;
    });

    // Sort by newest first
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    renderItems(items);
  }

  // Upload form handler
  onReady(() => {
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
      uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const user = getCurrentUser();
        if (!user) {
          alert('Please login first');
          window.location.href = 'index.html';
          return;
        }

        const title = document.getElementById('item-title')?.value.trim();
        const description = document.getElementById('item-description')?.value.trim();
        const category = document.getElementById('item-category')?.value;
        const location = document.getElementById('item-location')?.value;
        const imageFile = document.getElementById('item-image')?.files[0];

        if (!title || !description || !category || !location) {
          alert('Please fill all required fields');
          return;
        }

        const handleUpload = (imageData) => {
          const newItem = DB.addItem({
            title,
            description,
            category,
            location,
            image: imageData,
            uploadedBy: user.id,
            uploadedByName: user.name
          });

          alert('Item uploaded successfully!');
          uploadForm.reset();
          loadItems();
        };

        if (imageFile) {
          imageToBase64(imageFile, handleUpload);
        } else {
          handleUpload(null);
        }
      });
    }
  });

  // Search and filter handlers
  onReady(() => {
    const searchForm = document.getElementById('search-filters');
    if (searchForm) {
      searchForm.addEventListener('input', loadItems);
      searchForm.addEventListener('change', loadItems);
      searchForm.addEventListener('reset', () => {
        setTimeout(loadItems, 0);
      });
    }
  });

  // Load conversations for Admin/Management
  function loadConversations() {
    const user = getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'management')) {
      return;
    }

    const section = document.getElementById('conversations-section');
    const list = document.getElementById('conversations-list');
    
    if (!section || !list) return;

    const conversations = DB.getConversations();
    
    if (conversations.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    
    list.innerHTML = conversations.map(conv => {
      const item = DB.getItemById(conv.itemId);
      const lastMessage = conv.messages && conv.messages.length > 0 
        ? conv.messages[conv.messages.length - 1] 
        : null;
      
      return `
        <div style="padding: 16px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 12px; background: var(--bg);">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <div>
              <strong style="color: var(--primary);">${escapeHtml(item ? item.title : 'Unknown Item')}</strong>
              <p style="margin: 4px 0; font-size: 14px; color: var(--text-dim);">
                Between: ${escapeHtml(conv.participant1Name)} ↔ ${escapeHtml(conv.participant2Name)}
              </p>
            </div>
            <a href="chat.html?conversation=${conv.id}" class="btn btn-sm btn-primary">View Chat</a>
          </div>
          ${lastMessage ? `
            <p style="margin: 0; font-size: 13px; color: var(--text-dim);">
              <strong>Last message:</strong> ${escapeHtml(lastMessage.message.substring(0, 100))}${lastMessage.message.length > 100 ? '...' : ''}
              <span style="margin-left: 8px; font-size: 12px;">(${formatDate(lastMessage.timestamp)})</span>
            </p>
          ` : '<p style="margin: 0; font-size: 13px; color: var(--text-dim);">No messages yet</p>'}
        </div>
      `;
    }).join('');
  }

  // Hide upload section for admin
  onReady(() => {
    const user = getCurrentUser();
    if (user && user.role === 'admin') {
      const uploadSection = document.getElementById('upload-section');
      if (uploadSection) {
        uploadSection.style.display = 'none';
      }
    }
  });

  // Initial load
  onReady(() => {
    loadItems();
    loadConversations();
  });
})();

