/**
 * Public website settings - edit these in one place.
 * Contact details come from the original site (backend/config/contact.php).
 * Leave a value empty to hide it; never fill in guessed links or names.
 */
export const SITE = {
  name: 'PhentiBuild',
  tagline: 'Build Smarter. Measure Better.',
  email: 'phentibuild@gmail.com',
  whatsapp: '+233577577327',
  whatsappAlt: '+233554072100',
  phone: '+233577577327',
  phoneAlt: '+233554072100',
  /** Business location - not provided yet. */
  location: '',
  /** Official social pages - add the real URLs when they exist. */
  social: {
    facebook: '',
    instagram: '',
    linkedin: '',
    tiktok: '',
    x: '',
  } as Record<string, string>,
  /** The people behind PhentiBuild, shown on the About page. Add real names and roles. */
  team: [] as { name: string; role: string; bio?: string; photo?: string }[],
  legalUpdated: '15 November 2026',
}

export const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/features', label: 'Features' },
  { to: '/solutions', label: 'Solutions' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

export const FOOTER_SHEETS = [
  { group: 'Product', links: [
    { to: '/features', label: 'Features' }, { to: '/how-it-works', label: 'How it works' },
    { to: '/solutions', label: 'Who it’s for' }, { to: '/pricing', label: 'Pricing' },
  ] },
  { group: 'Company', links: [
    { to: '/about', label: 'About' }, { to: '/contact', label: 'Contact' }, { to: '/faq', label: 'FAQ' },
  ] },
  { group: 'Legal', links: [
    { to: '/legal/privacy', label: 'Privacy Policy' }, { to: '/legal/terms', label: 'Terms & Conditions' },
    { to: '/legal/cookies', label: 'Cookie Policy' }, { to: '/legal/security', label: 'Security & Data Protection' },
  ] },
]

export const waLink = (number: string) => `https://wa.me/${number.replace(/[^\d]/g, '')}`
export const telLink = (number: string) => `tel:${number.replace(/\s/g, '')}`
export const prettyPhone = (n: string) => n.replace(/^\+233(\d{2})(\d{3})(\d{4})$/, '+233 $1 $2 $3')
