import { marked } from 'marked';
import DOMPurify from 'dompurify';

class PiNotesApp {
  constructor() {
    this.notes = [];
    this.activeNoteId = null;
    this.isPreviewMode = false;
    this.currentColor = '#ffffff';
    this.isEditing = false;
    this.searchTerm = '';
    
    // DOM Elements
    this.elements = {
      notesList: document.getElementById('notes-list'),
      noteTitle: document.getElementById('note-title'),
      noteContent: document.getElementById('note-content'),
      previewContent: document.getElementById('preview-content'),
      previewBtn: document.getElementById('preview-btn'),
      newNoteBtn: document.getElementById('new-note-btn'),
      favoriteBtn: document.getElementById('favorite-btn'),
      backBtn: document.getElementById('back-btn'),
      lastEdited: document.getElementById('last-edited'),
      colorPalette: document.getElementById('color-palette'),
      welcomeScreen: document.getElementById('welcome-screen'),
      getStartedBtn: document.getElementById('get-started-btn'),
      searchBtn: document.getElementById('search-btn'),
      searchContainer: document.getElementById('search-container'),
      searchInput: document.getElementById('search-input'),
      moreBtn: document.getElementById('more-btn'),
      moreDropdown: document.getElementById('more-dropdown'),
      deleteNote: document.getElementById('delete-note'),
      exportNote: document.getElementById('export-note'),
      shareNote: document.getElementById('share-note'),
      changeColor: document.getElementById('change-color'),
      deleteModal: document.getElementById('delete-modal'),
      cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
      confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
      sidebar: document.querySelector('.sidebar')
    };
    
    this.init();
  }
  
  init() {
    this.loadNotes();
    
    // Check for shared note in URL before showing welcome screen
    const hasSharedNote = this.checkForSharedNote();
    
    if (!hasSharedNote) {
      this.attachEventListeners();
      this.checkFirstVisit();
      this.renderNotesList();
    } else {
      this.attachEventListeners();
      this.renderNotesList();
    }
    
    // Set up autosave timer
    setInterval(() => this.saveActiveNote(), 5000);
  }
  
  attachEventListeners() {
    // Note creation and selection
    this.elements.newNoteBtn.addEventListener('click', () => this.createNewNote());
    this.elements.backBtn.addEventListener('click', () => this.handleBackButton());
    
    // Editing and preview
    this.elements.noteTitle.addEventListener('input', () => {
      this.isEditing = true;
      this.updateLastEdited();
      this.saveActiveNote();
    });
    
    this.elements.noteContent.addEventListener('input', () => {
      this.isEditing = true;
      this.updateLastEdited();
      this.saveActiveNote();
    });
    
    this.elements.previewBtn.addEventListener('click', () => this.togglePreview());
    
    // Favorite button
    this.elements.favoriteBtn.addEventListener('click', () => this.toggleFavorite());
    
    // Color palette
    this.elements.changeColor.addEventListener('click', (e) => {
      e.preventDefault();
      this.elements.colorPalette.classList.toggle('hidden');
      this.elements.moreDropdown.classList.remove('active');
    });
    
    this.elements.colorPalette.querySelectorAll('.color-option').forEach(option => {
      option.style.backgroundColor = option.dataset.color;
      option.addEventListener('click', () => this.changeNoteColor(option.dataset.color));
    });
    
    // Welcome screen
    this.elements.getStartedBtn.addEventListener('click', () => {
      this.elements.welcomeScreen.classList.add('hidden');
      localStorage.setItem('notesAppFirstVisit', 'false');
      this.createNewNote();
    });
    
    // Search functionality
    this.elements.searchBtn.addEventListener('click', () => {
      this.elements.searchContainer.classList.toggle('hidden');
      if (!this.elements.searchContainer.classList.contains('hidden')) {
        this.elements.searchInput.focus();
      } else {
        this.searchTerm = '';
        this.elements.searchInput.value = '';
        this.renderNotesList();
      }
    });
    
    this.elements.searchInput.addEventListener('input', (e) => {
      this.searchTerm = e.target.value.trim().toLowerCase();
      this.renderNotesList();
    });
    
    // More dropdown
    this.elements.moreBtn.addEventListener('click', () => {
      this.elements.moreDropdown.classList.toggle('active');
    });
    
    // Delete note
    this.elements.deleteNote.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.activeNoteId) {
        this.elements.deleteModal.classList.remove('hidden');
        this.elements.moreDropdown.classList.remove('active');
      } else {
        this.showToast('Please select a note to delete', 'error');
      }
    });
    
    this.elements.cancelDeleteBtn.addEventListener('click', () => {
      this.elements.deleteModal.classList.add('hidden');
    });
    
    this.elements.confirmDeleteBtn.addEventListener('click', () => {
      this.deleteActiveNote();
      this.elements.deleteModal.classList.add('hidden');
    });
    
    // Export note
    this.elements.exportNote.addEventListener('click', (e) => {
      e.preventDefault();
      this.exportActiveNote();
      this.elements.moreDropdown.classList.remove('active');
    });
    
    // Share note
    this.elements.shareNote.addEventListener('click', (e) => {
      e.preventDefault();
      this.shareActiveNote();
      this.elements.moreDropdown.classList.remove('active');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#more-btn') && !e.target.closest('#more-dropdown')) {
        this.elements.moreDropdown.classList.remove('active');
      }
    });
  }
  
  loadNotes() {
    const savedNotes = localStorage.getItem('notes');
    this.notes = savedNotes ? JSON.parse(savedNotes) : [];
    
    // If there are no notes, create a welcome note
    if (this.notes.length === 0) {
      this.notes = [this.createWelcomeNote()];
      this.saveNotes();
    }
  }
  
  createWelcomeNote() {
    return {
      id: this.generateId(),
      title: 'Welcome to PiNotes!',
      content: `# Welcome to PiNotes!\n\nHere are some tips to get started:\n\n## Features\n\n- **Markdown Support**: Format your notes using markdown syntax\n- **Preview Mode**: Click the eye icon to preview your formatted notes\n- **Favorite Notes**: Star important notes to find them easily\n- **Color Coding**: Organize with different colors\n- **Search**: Quickly find notes\n\n## Markdown Tips\n\n- Use # for headers\n- *italic* or _italic_\n- **bold** or __bold__\n- [Link](https://example.com)\n- - Bullet points\n- 1. Numbered lists\n\nStart by creating a new note with the + button!\nFor More Stuffs checkout [Link](http://heyaryx.me)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      color: '#ffffff',
      isFavorite: false
    };
  }
  
  saveNotes() {
    localStorage.setItem('notes', JSON.stringify(this.notes));
  }
  
  renderNotesList() {
    this.elements.notesList.innerHTML = '';
    
    // Filter notes by search term if exists
    let filteredNotes = this.notes;
    if (this.searchTerm) {
      filteredNotes = this.notes.filter(note => 
        note.title.toLowerCase().includes(this.searchTerm) || 
        note.content.toLowerCase().includes(this.searchTerm)
      );
    }
    
    // Sort notes by favorites first, then by updated date
    filteredNotes.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
    
    if (filteredNotes.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.textContent = this.searchTerm ? 'No matching notes found' : 'No notes yet. Create your first note!';
      this.elements.notesList.appendChild(emptyState);
      return;
    }
    
    filteredNotes.forEach(note => {
      const noteElement = document.createElement('div');
      noteElement.className = 'note-item';
      noteElement.dataset.id = note.id;
      
      if (note.id === this.activeNoteId) {
        noteElement.classList.add('active');
      }
      
      if (note.isFavorite) {
        noteElement.classList.add('favorite');
      }
      
      // Set background color if it's not the default
      if (note.color && note.color !== '#ffffff') {
        noteElement.style.backgroundColor = note.color;
      }
      
      // Get first 30 characters of content without markdown
      const previewContent = note.content.replace(/[#*_\[\]`]/g, '').slice(0, 60);
      
      // Format the date
      const date = new Date(note.updatedAt);
      const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      
      noteElement.innerHTML = `
        <div class="note-title">${note.title || 'Untitled'}</div>
        <div class="note-preview">${previewContent}...</div>
        <div class="note-date">${formattedDate}</div>
        <i class="note-star ${note.isFavorite ? 'fas' : 'far'} fa-star"></i>
      `;
      
      noteElement.addEventListener('click', () => this.openNote(note.id));
      
      // Add star click functionality
      const star = noteElement.querySelector('.note-star');
      star.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFavorite(note.id);
      });
      
      this.elements.notesList.appendChild(noteElement);
    });
  }
  
  createNewNote() {
    const newNote = {
      id: this.generateId(),
      title: '',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      color: '#ffffff',
      isFavorite: false
    };
    
    this.notes.unshift(newNote);
    this.saveNotes();
    this.openNote(newNote.id);
    this.showToast('New note created', 'success');
    
    // Auto focus the title input
    setTimeout(() => {
      this.elements.noteTitle.focus();
    }, 0);
  }
  
  openNote(id) {
    // Save any changes to the current active note before switching
    this.saveActiveNote();
    
    const note = this.notes.find(note => note.id === id);
    if (!note) return;
    
    this.activeNoteId = id;
    this.elements.noteTitle.value = note.title;
    this.elements.noteContent.value = note.content;
    this.currentColor = note.color;
    
    // Update preview if in preview mode
    if (this.isPreviewMode) {
      this.renderPreview();
    }
    
    // Update UI state
    this.elements.favoriteBtn.innerHTML = note.isFavorite ? 
      '<i class="fas fa-star"></i>' : 
      '<i class="far fa-star"></i>';
    
    this.updateLastEdited(new Date(note.updatedAt));
    this.renderNotesList();
    
    // Adjust the color of the editor
    document.querySelector('.main-content').style.backgroundColor = note.color;
    
    // On mobile, collapse the sidebar after selecting a note
    if (window.innerWidth <= 768) {
      this.elements.sidebar.classList.add('hidden');
    }
  }
  
  saveActiveNote() {
    if (!this.activeNoteId || !this.isEditing) return;
    
    const activeNote = this.notes.find(note => note.id === this.activeNoteId);
    if (!activeNote) return;
    
    activeNote.title = this.elements.noteTitle.value;
    activeNote.content = this.elements.noteContent.value;
    activeNote.updatedAt = new Date().toISOString();
    activeNote.color = this.currentColor;
    
    this.saveNotes();
    this.isEditing = false;
    this.renderNotesList();
  }
  
  deleteActiveNote() {
    if (!this.activeNoteId) return;
    
    this.notes = this.notes.filter(note => note.id !== this.activeNoteId);
    this.saveNotes();
    
    this.activeNoteId = null;
    this.elements.noteTitle.value = '';
    this.elements.noteContent.value = '';
    this.elements.previewContent.innerHTML = '';
    document.querySelector('.main-content').style.backgroundColor = '#ffffff';
    
    this.renderNotesList();
    this.showToast('Note deleted', 'info');
    
    // If there are still notes, open the first one
    if (this.notes.length > 0) {
      this.openNote(this.notes[0].id);
    } else {
      this.createNewNote();
    }
  }
  
  togglePreview() {
    this.isPreviewMode = !this.isPreviewMode;
    
    if (this.isPreviewMode) {
      this.elements.previewBtn.classList.add('active');
      this.elements.noteContent.classList.add('hidden');
      this.elements.previewContent.classList.remove('hidden');
      this.renderPreview();
    } else {
      this.elements.previewBtn.classList.remove('active');
      this.elements.noteContent.classList.remove('hidden');
      this.elements.previewContent.classList.add('hidden');
    }
  }
  
  renderPreview() {
    const rawContent = this.elements.noteContent.value;
    const htmlContent = marked(rawContent);
    const sanitizedHtml = DOMPurify.sanitize(htmlContent);
    this.elements.previewContent.innerHTML = sanitizedHtml;
  }
  
  toggleFavorite(noteId = null) {
    const id = noteId || this.activeNoteId;
    if (!id) return;
    
    const noteIndex = this.notes.findIndex(note => note.id === id);
    if (noteIndex === -1) return;
    
    this.notes[noteIndex].isFavorite = !this.notes[noteIndex].isFavorite;
    this.saveNotes();
    
    // Update UI if toggling the active note
    if (id === this.activeNoteId) {
      this.elements.favoriteBtn.innerHTML = this.notes[noteIndex].isFavorite ? 
        '<i class="fas fa-star"></i>' : 
        '<i class="far fa-star"></i>';
    }
    
    this.renderNotesList();
    
    this.showToast(
      this.notes[noteIndex].isFavorite ? 'Added to favorites' : 'Removed from favorites', 
      'info'
    );
  }
  
  changeNoteColor(color) {
    if (!this.activeNoteId) return;
    
    this.currentColor = color;
    document.querySelector('.main-content').style.backgroundColor = color;
    
    // Update the note color in the data
    const activeNote = this.notes.find(note => note.id === this.activeNoteId);
    if (activeNote) {
      activeNote.color = color;
      this.saveNotes();
      this.renderNotesList();
    }
    
    this.elements.colorPalette.classList.add('hidden');
    this.showToast('Note color updated', 'info');
  }
  
  exportActiveNote() {
    if (!this.activeNoteId) {
      this.showToast('Please select a note to export', 'error');
      return;
    }
    
    const note = this.notes.find(note => note.id === this.activeNoteId);
    if (!note) return;
    
    const fileName = `${note.title || 'Note'}.md`;
    const fileContent = note.content;
    
    const blob = new Blob([fileContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    
    URL.revokeObjectURL(url);
    this.showToast('Note exported as Markdown', 'success');
  }
  
  shareActiveNote() {
    if (!this.activeNoteId) {
      this.showToast('Please select a note to share', 'error');
      return;
    }
    
    const note = this.notes.find(note => note.id === this.activeNoteId);
    if (!note) return;
    
    // Encrypt note data
    const noteData = {
      title: note.title || 'Untitled',
      content: note.content,
      color: note.color
    };
    
    const encodedData = this.encryptNote(noteData);
    const shareUrl = `${window.location.origin}${window.location.pathname}?v=${encodedData}`;
    
    // Try to use navigator.share if available
    if (navigator.share) {
      navigator.share({
        title: note.title || 'Note',
        text: `Check out my note: ${note.title || 'Untitled'}`,
        url: shareUrl
      })
      .then(() => this.showToast('Note shared successfully', 'success'))
      .catch(error => {
        console.error('Error sharing:', error);
        // Fallback to clipboard
        this.copyToClipboard(shareUrl);
      });
    } else {
      // Fallback - copy to clipboard
      this.copyToClipboard(shareUrl);
    }
  }
  
  copyToClipboard(text) {
    navigator.clipboard.writeText(text)
      .then(() => this.showToast('Share link copied to clipboard', 'success'))
      .catch(() => this.showToast('Failed to copy share link', 'error'));
  }
  
  encryptNote(noteData) {
    // Add version and timestamp to the note data for future-proofing
    const enhancedNoteData = {
      version: "current", 
      timestamp: Date.now(), 
      ...noteData
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(enhancedNoteData);
  
    // Use base64 encoding with some basic obfuscation
    return btoa(jsonString)
      .replace(/=/g, '')  // Remove padding
      .replace(/\+/g, '-')  // Make URL-safe
      .replace(/\//g, '_');
  }

  decryptNote(encodedData) {
    try {
      // Restore base64 padding and URL-safe characters
      let base64Data = encodedData
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      // Add back padding if needed
      while (base64Data.length % 4 !== 0) {
        base64Data += '=';
      }

      // Decode base64
      const jsonString = atob(base64Data);
      
      // Parse JSON
      const noteData = JSON.parse(jsonString);

      // Return note data regardless of version structure
      return {
        title: noteData.title || 'Shared Note',
        content: noteData.content || '',
        color: noteData.color || '#ffffff'
      };
    } catch (e) {
      console.error('Failed to decrypt note:', e);
      return null;
    }
  }

  checkForSharedNote() {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedNote = urlParams.get('v');
    
    if (encodedNote) {
      try {
        const decodedNote = this.decryptNote(encodedNote);
        if (decodedNote) {
          this.loadSharedNote(decodedNote);
          // Clear the URL parameter after loading
          window.history.replaceState({}, document.title, window.location.pathname);
          return true;
        }
      } catch (error) {
        console.error('Error loading shared note:', error);
      }
      this.showToast('Invalid or expired shared note', 'error');
    }
    return false;
  }

  loadSharedNote(noteData) {
    const newNote = {
      id: this.generateId(),
      title: noteData.title || 'Shared Note',
      content: noteData.content || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      color: noteData.color || '#ffffff',
      isFavorite: false
    };
    
    this.notes.unshift(newNote);
    this.saveNotes();
    this.openNote(newNote.id);
    this.showToast('Shared note loaded successfully', 'success');
  }
  
  handleBackButton() {
    // On mobile, this will switch between note list and editor
    if (window.innerWidth <= 768) {
      this.elements.sidebar.classList.toggle('hidden');
    }
  }
  
  updateLastEdited(date = new Date()) {
    const timeAgo = this.getTimeAgo(date);
    this.elements.lastEdited.textContent = `Last edited: ${timeAgo}`;
  }
  
  getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    
    // Less than a minute
    if (diff < 60000) {
      return 'Just now';
    }
    
    // Less than an hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    
    // Less than a day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    
    // Format as date
    return date.toLocaleDateString() + ' ' + 
           date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  checkFirstVisit() {
    const isFirstVisit = localStorage.getItem('notesAppFirstVisit') !== 'false';
    if (isFirstVisit) {
      this.elements.welcomeScreen.classList.remove('hidden');
    } else if (this.notes.length > 0) {
      this.openNote(this.notes[0].id);
    }
  }
  
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.getElementById('toast-container').appendChild(toast);
    
    // Remove toast after animation completes
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
  
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Initialize the app when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new PiNotesApp();
  
  // Handle visibility change to save notes when user leaves the page
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      app.saveActiveNote();
    }
  });
  
  // Add event listener for beforeunload to save notes
  window.addEventListener('beforeunload', () => {
    app.saveActiveNote();
  });
});
