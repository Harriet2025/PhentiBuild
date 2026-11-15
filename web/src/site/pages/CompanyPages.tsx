import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { request } from '../../api/client'
import { endpoints } from '../../api/endpoints'
import { FAQ_GROUPS, PROBLEMS } from '../content'
import { Glyph, Sheet } from '../drawing'
import { Checklist, CtaBand, FaqList, PageHero } from '../parts'
import { prettyPhone, SITE, telLink, waLink } from '../siteConfig'

/* ------------------------------------------------------------------ About */
const PILLARS = [
  { title: 'Accessible', text: 'Powerful estimating shouldn’t be locked behind expensive software or years of training. PhentiBuild works as well for a site manager with a phone in one hand as for a quantity surveyor at a desk.' },
  { title: 'Accurate & transparent', text: 'Every calculation shows its assumptions next to its answer. When you can see how a figure was reached, you can trust it — and correct it if it’s wrong.' },
  { title: 'Rooted in real practice', text: 'Construction knowledge built over generations doesn’t need replacing; it needs faster tools to apply it. PhentiBuild is built around the methods professionals already trust.' },
  { title: 'One connected workflow', text: 'Measurement, calculation, design and documentation belong together. Keeping them in one place means nothing gets lost between a site visit and a final report.' },
]

export function AboutPage() {
  useEffect(() => { document.title = 'About — PhentiBuild' }, [])
  return (
    <>
      <PageHero sheet="A-04" kicker="About" title={<>Closing the gap between the <span className="ps-accent">site</span> and the <span className="ps-accent">spreadsheet</span>.</>}
        lead="PhentiBuild is a construction technology platform built in Ghana for the people who measure, estimate, design and build." />
      <section className="ps-section">
        <div className="ps-container ps-split">
          <div>
            <Sheet no="A-04.1" kicker="The problem" title="Good builders, scattered tools." />
            <p className="ps-prose">A single estimate can pass through a notebook, a phone calculator, a spreadsheet and a separate drawing tool before it reaches a client — and every hand-off is a place where a number drifts, a unit gets lost or a quantity quietly goes stale.</p>
            <p className="ps-prose">None of that is a failure of the people doing the work. It’s a gap in their tools: software built for an office, not a site, that thinks in single calculations instead of whole projects. PhentiBuild exists to close that gap.</p>
          </div>
          <ul className="ps-mini-problems">{PROBLEMS.map((p) => <li key={p.title}><b>{p.title}.</b> {p.text}</li>)}</ul>
        </div>
      </section>
      <section className="ps-section ps-section--dark ps-grid-dark">
        <div className="ps-container ps-mv">
          <article><p className="ps-sheet-tag ps-sheet-tag--light"><span className="ps-sheet-no">M</span><span className="ps-sheet-rule" /><span>Mission</span></p>
            <h2>Give every construction professional the tools to measure, estimate and plan with confidence.</h2></article>
          <article><p className="ps-sheet-tag ps-sheet-tag--light"><span className="ps-sheet-no">V</span><span className="ps-sheet-rule" /><span>Vision</span></p>
            <h2>Construction planning that is smarter, faster and accessible to everyone — from a student’s first estimate to a contractor’s hundredth project.</h2></article>
        </div>
      </section>
      <section className="ps-section">
        <div className="ps-container">
          <Sheet no="A-04.2" kicker="What we believe" title="Four ideas behind every decision." />
          <div className="ps-pillars">{PILLARS.map((p, i) => <article key={p.title} className="ps-pillar"><span>{String(i + 1).padStart(2, '0')}</span><h3>{p.title}</h3><p>{p.text}</p></article>)}</div>
        </div>
      </section>
      <section className="ps-section ps-section--muted">
        <div className="ps-container">
          <Sheet no="A-04.3" kicker="The people" title="The team behind PhentiBuild." />
          {SITE.team.length > 0 ? (
            <div className="ps-team">
              {SITE.team.map((m) => (
                <article key={m.name} className="ps-member">
                  {m.photo ? <img src={m.photo} alt="" /> : <span className="ps-member-initials">{m.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>}
                  <h3>{m.name}</h3><p className="ps-member-role">{m.role}</p>{m.bio && <p>{m.bio}</p>}
                </article>
              ))}
            </div>
          ) : (
            <p className="ps-prose">PhentiBuild is built in Ghana by people who work at the meeting point of construction and software — and shaped by contractors, site managers, quantity surveyors and draftsmen who use it on real jobs. <Link to="/contact" className="ps-link">Get in touch</Link> — we’d like to hear how you work.</p>
          )}
        </div>
      </section>
      <CtaBand />
    </>
  )
}

/* ------------------------------------------------------------------ Pricing */
export function PricingPage() {
  useEffect(() => { document.title = 'Pricing — PhentiBuild' }, [])
  return (
    <>
      <PageHero sheet="A-05" kicker="Pricing" title={<>Plans are being <span className="ps-accent">finalised</span>.</>}
        lead="We’re shaping free and paid plans around how teams actually use PhentiBuild. Until then, there is no charge to create an account." />
      <section className="ps-section">
        <div className="ps-container ps-narrow">
          <div className="ps-soon">
            <span className="ps-soon-stamp">Coming soon</span>
            <h2>What plans will cover</h2>
            <Checklist items={['A free plan for individuals and students', 'Paid plans for teams that need more projects, users and exports', 'Clear limits, shown before you hit them', 'Prices in Ghana cedis']} />
            <p className="ps-prose">Want to know when pricing is announced, or need a plan for your company now? <Link to="/contact" className="ps-link">Contact us</Link>.</p>
          </div>
        </div>
      </section>
      <CtaBand title="Start free today." text="Create an account — no card, no charge." />
    </>
  )
}

/* ------------------------------------------------------------------ FAQ */
export function FaqPage() {
  useEffect(() => { document.title = 'FAQ — PhentiBuild' }, [])
  return (
    <>
      <PageHero sheet="A-06" kicker="FAQ" title="Questions, answered." lead="Calculations, accounts, projects, data and day-to-day use." />
      <section className="ps-section">
        <div className="ps-container ps-narrow">
          {FAQ_GROUPS.map((g, i) => (
            <div key={g.title} className="ps-faq-group">
              <p className="ps-sheet-tag"><span className="ps-sheet-no">Q{i + 1}</span><span className="ps-sheet-rule" /><span>{g.title}</span></p>
              <FaqList items={g.items} />
            </div>
          ))}
          <p className="ps-center ps-prose">Still stuck? <Link to="/contact" className="ps-link">Ask us directly</Link>.</p>
        </div>
      </section>
    </>
  )
}

/* ------------------------------------------------------------------ Contact */
type Form = { name: string; email: string; phone: string; subject: string; message: string; website: string }
const EMPTY: Form = { name: '', email: '', phone: '', subject: '', message: '', website: '' }

function validate(f: Form) {
  const e: Partial<Record<keyof Form, string>> = {}
  if (f.name.trim().length < 2) e.name = 'Enter your full name.'
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(f.email.trim())) e.email = 'Enter a valid email address.'
  if (f.phone.trim() && !/^\+?\d{7,15}$/.test(f.phone.replace(/[\s\-().]/g, ''))) e.phone = 'Enter a valid phone number (7–15 digits).'
  if (f.subject.trim().length < 3) e.subject = 'Add a short subject.'
  if (f.message.trim().length < 10) e.message = 'Tell us a little more (at least 10 characters).'
  return e
}

export function ContactPage() {
  useEffect(() => { document.title = 'Contact — PhentiBuild' }, [])
  const [f, setF] = useState<Form>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [serverError, setServerError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    const errs = validate(f)
    setErrors(errs)
    if (Object.keys(errs).length) return
    setStatus('sending')
    const r = await request('POST', endpoints.contact, { body: { ...f, name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() || undefined, subject: f.subject.trim(), message: f.message.trim() } })
    if (r.ok) { setStatus('sent'); setF(EMPTY); return }
    setStatus('error')
    setServerError(r.error)
    if (r.errors) setErrors(r.errors as Partial<Record<keyof Form, string>>)
  }

  const field = (k: keyof Form, label: string, props: Record<string, unknown> = {}, required = true) => (
    <div className="form-group">
      <label className="form-label" htmlFor={`ct-${k}`}>{label} {required && <span className="required">*</span>}</label>
      {k === 'message'
        ? <textarea id={`ct-${k}`} rows={6} className={`form-control${errors[k] ? ' is-invalid' : ''}`} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...props} />
        : <input id={`ct-${k}`} className={`form-control${errors[k] ? ' is-invalid' : ''}`} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...props} />}
      {errors[k] && <span className="form-error">{errors[k]}</span>}
    </div>
  )
  const socials = Object.entries(SITE.social).filter(([, url]) => url)

  return (
    <>
      <PageHero sheet="A-07" kicker="Contact" title={<>Let’s build something <span className="ps-accent">better</span>.</>}
        lead="Questions, a demo for your team, or feedback from site — we read every message." />
      <section className="ps-section">
        <div className="ps-container ps-contact">
          <div className="ps-channels">
            <a className="ps-channel" href={waLink(SITE.whatsapp)} target="_blank" rel="noopener noreferrer"><Glyph name="chat" /><span><b>WhatsApp</b>{prettyPhone(SITE.whatsapp)}</span></a>
            {SITE.whatsappAlt && <a className="ps-channel" href={waLink(SITE.whatsappAlt)} target="_blank" rel="noopener noreferrer"><Glyph name="chat" /><span><b>WhatsApp (second line)</b>{prettyPhone(SITE.whatsappAlt)}</span></a>}
            <a className="ps-channel" href={telLink(SITE.phone)}><Glyph name="phone" /><span><b>Call us</b>{prettyPhone(SITE.phone)}{SITE.phoneAlt && ` · ${prettyPhone(SITE.phoneAlt)}`}</span></a>
            <a className="ps-channel" href={`mailto:${SITE.email}`}><Glyph name="mail" /><span><b>Email</b>{SITE.email}</span></a>
            {SITE.location && <p className="ps-channel"><Glyph name="map" /><span><b>Location</b>{SITE.location}</span></p>}
            <p className="ps-channel-note">{socials.length ? socials.map(([k, url]) => <a key={k} href={url} target="_blank" rel="noopener noreferrer">{k}</a>) : 'Social media pages: coming soon.'}</p>
          </div>
          <form className="ps-form" noValidate onSubmit={submit}>
            <h2>Send us a message</h2>
            {status === 'sent' && <div className="alert alert-success"><span className="alert-icon">✓</span><div className="alert-body"><span className="alert-title">Message sent</span><span>Thank you — we’ll get back to you soon.</span></div></div>}
            {status === 'error' && <div className="alert alert-danger"><span className="alert-icon">!</span><div className="alert-body"><span className="alert-title">Couldn’t send your message</span><span>{serverError}</span></div></div>}
            <div className="form-row">{field('name', 'Full name', { autoComplete: 'name' })}{field('email', 'Email', { type: 'email', autoComplete: 'email' })}</div>
            <div className="form-row">{field('phone', 'Phone', { autoComplete: 'tel' }, false)}{field('subject', 'Subject')}</div>
            {field('message', 'Message')}
            {/* Spam trap: real people never see or fill this. */}
            <div className="ps-hp" aria-hidden="true"><label>Leave this empty<input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></label></div>
            <button type="submit" className="btn btn-primary btn-lg" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Send message'}</button>
          </form>
        </div>
      </section>
    </>
  )
}
