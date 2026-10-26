window.IMAGES = {
  category: {
    'appliance-repair':  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop&q=70',
    'plumbing':          'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&auto=format&fit=crop&q=70',
    'electrical':        'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=70',
    'cleaning-pest':     'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=70',
    'home-maintenance':  'https://images.unsplash.com/photo-1581141849291-1125c7b692b5?w=800&auto=format&fit=crop&q=70',
    'moving-shifting':   'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=800&auto=format&fit=crop&q=70',
    'car-care':          'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&auto=format&fit=crop&q=70',
    'personal-care':     'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=70'
  },
  categoryFallback: (slug) => `https://ui-avatars.com/api/?name=${encodeURIComponent(slug)}&background=2563eb&color=fff&size=400`,
  providerAvatar: (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1e293b&color=fff&size=200&bold=true`,
  category(slug) { return this.category[slug] || this.categoryFallback(slug); }
};
