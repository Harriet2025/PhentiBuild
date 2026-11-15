import { useEffect } from 'react'
import { Link, NavLink, useParams } from 'react-router-dom'
import { PageHero } from '../parts'
import { SITE } from '../siteConfig'

/**
 * Legal & trust pages. They describe what the platform really does
 * (cookies it really sets, services it really uses). Have them reviewed
 * by a lawyer before public launch.
 */
type Doc = { title: string; intro: string; sections: { h: string; p: string[] }[] }

const DOCS: Record<string, Doc> = {
  privacy: {
    title: 'Privacy Policy',
    intro: `This policy explains what personal information PhentiBuild collects, why, and the choices you have. It is written to meet the Data Protection Act, 2012 (Act 843) of Ghana.`,
    sections: [
      { h: 'Who we are', p: [`PhentiBuild provides construction measuring, estimating and planning software. You can reach us about privacy at ${SITE.email}.`] },
      { h: 'Information we collect', p: [
        'Account details: your name, email address, phone number, profession, and a password (stored only as a one-way encrypted hash — never in readable form). If you sign in with Google, we receive your name and verified email address from Google.',
        'Your work: projects, measurements, calculations, Bill of Quantities items, roof designs, reports and the history of changes you make.',
        'Photos: when you use the Camera Scanner, the photo is processed to find the measuring marker and is not stored by PhentiBuild. If optional AI recognition is switched on, the photo is sent to our AI provider (Anthropic) for analysis.',
        'Messages you send through the contact form.',
        'Technical information needed to run the service: a session cookie, a security cookie, and server logs (such as IP address and time of a request).',
      ] },
      { h: 'How we use it', p: ['To provide and secure your account, save and show your work, answer your messages, prevent abuse, and improve the platform. We do not sell your personal information and we do not use it for advertising.'] },
      { h: 'Who we share it with', p: ['Only service providers that help us run PhentiBuild: hosting and database providers, Google (only if you choose Google sign-in), and Anthropic (only for photos, and only when AI recognition is switched on). They may process data only to provide their service to us. We may disclose information if the law requires it.'] },
      { h: 'Who can see your work', p: ['Your projects and records are visible to you. Administrators of your PhentiBuild account can see all records in order to manage it. Other users cannot see your work.'] },
      { h: 'How long we keep it', p: ['For as long as your account is active, and afterwards only as long as needed for legal, accounting or security reasons. You can ask us to delete your account and data.'] },
      { h: 'Your rights', p: [`You may ask to see the personal information we hold about you, to correct it, or to have it deleted, and you may object to how it is used. Email ${SITE.email}. You can also complain to Ghana’s Data Protection Commission.`] },
      { h: 'Children', p: ['PhentiBuild is intended for professionals and students. It is not directed at children under 13.'] },
      { h: 'Changes', p: ['If we change this policy we will update the date on this page, and tell you in the app for significant changes.'] },
    ],
  },
  terms: {
    title: 'Terms and Conditions',
    intro: 'These terms govern your use of PhentiBuild. By creating an account or using the platform you agree to them.',
    sections: [
      { h: 'Your account', p: ['Give accurate information, keep your password safe, and tell us if you think someone else has used your account. You are responsible for activity under your account.'] },
      { h: 'Acceptable use', p: ['Do not misuse the platform: no attempts to access other people’s data, to disrupt or overload the service, to reverse-engineer security controls, or to use PhentiBuild for anything unlawful.'] },
      { h: 'Your content', p: ['You keep ownership of the projects, measurements and other content you put into PhentiBuild. You give us permission to store and process it only to provide the service to you.'] },
      { h: 'Estimates are estimates', p: ['Calculations, quantities, roof models and photo measurements are estimates for planning and pricing. They are not engineering certification. Check critical quantities against the drawings, local building codes and a qualified engineer before you rely on them. Photo measurements are shown with a margin and must be checked before saving.'] },
      { h: 'Availability and changes', p: ['We work to keep PhentiBuild available and your data safe, but we cannot promise the service will always be uninterrupted. We may improve or change features over time.'] },
      { h: 'Fees', p: ['There is currently no charge to create an account. If paid plans are introduced, their prices and limits will be shown clearly before you are asked to pay, and these terms will be updated.'] },
      { h: 'Our intellectual property', p: ['The PhentiBuild software, name, logo and website are owned by PhentiBuild. You may not copy or resell them.'] },
      { h: 'Ending your use', p: ['You can stop using PhentiBuild and ask us to delete your account at any time. We may suspend accounts that break these terms.'] },
      { h: 'Liability', p: ['To the extent the law allows, PhentiBuild is not liable for indirect losses, or for decisions made on estimates that were not checked. Nothing in these terms limits liability that cannot be limited under Ghanaian law.'] },
      { h: 'Governing law', p: [`These terms are governed by the laws of the Republic of Ghana. Questions: ${SITE.email}.`] },
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    intro: 'PhentiBuild uses only what it needs to keep you signed in and secure. There are no advertising or analytics cookies.',
    sections: [
      { h: 'Essential cookies', p: [
        'phb_sid — keeps you signed in. It is HttpOnly, so scripts on the page cannot read it. It lasts until you close the browser, or 30 days if you tick “Remember me”.',
        'phb_csrftoken — protects your account against forged requests from other websites.',
      ] },
      { h: 'Things stored in your browser', p: ['Small preferences such as your unit system, BOQ contingency percentage and the project you last worked on are kept in your browser’s local storage so the app remembers them. You can clear them by clearing your browser’s site data.'] },
      { h: 'Google sign-in', p: ['If you choose “Continue with Google”, Google shows its own sign-in window and may use its cookies under Google’s privacy policy.'] },
      { h: 'Your choices', p: ['Essential cookies are needed to sign in; if you block them, you won’t be able to use your account. Everything else on this page is optional.'] },
    ],
  },
  security: {
    title: 'Security & Data Protection',
    intro: 'How PhentiBuild protects your account and your work.',
    sections: [
      { h: 'Accounts and passwords', p: ['Passwords are stored only as bcrypt hashes. Login, sign-up and contact forms are rate-limited to slow down guessing and spam. Google sign-ins are verified with Google on our server before we trust them.'] },
      { h: 'Access control', p: ['Each person can see and change only their own projects and records. Administrator access can only be granted by whoever runs the PhentiBuild server — never through the website — so no one can make themselves an administrator.'] },
      { h: 'In transit and in the browser', p: ['In production, all traffic uses HTTPS. The session cookie is HttpOnly and every change you make carries a security token that blocks forged requests from other sites.'] },
      { h: 'Secrets and third parties', p: ['API keys and other secrets live only on our server, never in the website code. Photos for measuring are not stored; optional AI analysis sends them to Anthropic only when that feature is switched on.'] },
      { h: 'Backups', p: ['The database is backed up regularly so that work can be restored if something goes wrong.'] },
      { h: 'Reporting a problem', p: [`If you think you’ve found a security issue, please email ${SITE.email} with the details. Please don’t access other people’s data while testing.`] },
    ],
  },
}

const ORDER: [string, string][] = [['privacy', 'Privacy'], ['terms', 'Terms'], ['cookies', 'Cookies'], ['security', 'Security']]

export function LegalPage() {
  const { doc = 'privacy' } = useParams()
  const d = DOCS[doc] ?? DOCS.privacy
  useEffect(() => { document.title = `${d.title} — PhentiBuild` }, [d.title])
  return (
    <>
      <PageHero sheet="L-01" kicker="Legal" title={d.title} lead={d.intro}>
        <p className="ps-legal-date">Last updated {SITE.legalUpdated}</p>
      </PageHero>
      <section className="ps-section">
        <div className="ps-container ps-legal">
          <nav className="ps-legal-nav" aria-label="Legal pages">
            {ORDER.map(([k, label]) => <NavLink key={k} to={`/legal/${k}`} className={({ isActive }) => (isActive ? 'is-active' : '')}>{label}</NavLink>)}
          </nav>
          <article className="ps-legal-body">
            {d.sections.map((s, i) => (
              <section key={s.h}>
                <h2><span>{i + 1}.</span> {s.h}</h2>
                {s.p.map((t) => <p key={t.slice(0, 40)}>{t}</p>)}
              </section>
            ))}
            <p className="ps-legal-contact">Questions about this page? <Link to="/contact">Contact us</Link>.</p>
          </article>
        </div>
      </section>
    </>
  )
}
