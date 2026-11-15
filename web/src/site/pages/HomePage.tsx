import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { AUDIENCES, BENEFITS, FAQ_GROUPS, PROBLEMS, STEPS, TOOLS } from '../content'
import { Glyph, Ruler, Sheet } from '../drawing'
import { CtaBand, FaqList, ProductShot } from '../parts'
import { WallElevation } from '../WallElevation'

export function HomePage() {
  const { status } = useAuth()
  useEffect(() => { document.title = 'PhentiBuild — Construction measuring, estimating and BOQs in one place' }, [])
  const faqs = [FAQ_GROUPS[0].items[0], FAQ_GROUPS[0].items[2], FAQ_GROUPS[3].items[0], FAQ_GROUPS[4].items[0], FAQ_GROUPS[4].items[2]]

  return (
    <>
      {/* 1. HERO */}
      <section className="ps-hero ps-grid-dark">
        <div className="ps-container ps-hero-inner">
          <div className="ps-hero-copy">
            <p className="ps-hero-kicker"><span className="ps-dot" />Construction technology, made in Ghana</p>
            <h1 className="ps-hero-title">From the wall on site to the <span className="ps-accent">bill of quantities</span>.</h1>
            <p className="ps-hero-lead">PhentiBuild measures, calculates, designs and prices construction work in one connected platform — so the number you measure in the morning is the number in your client’s spreadsheet by the afternoon.</p>
            <div className="ps-hero-actions">
              {status === 'authenticated'
                ? <Link to="/dashboard" className="btn btn-primary btn-lg">Open your dashboard</Link>
                : <Link to="/register" className="btn btn-primary btn-lg">Get started — it’s free</Link>}
              <Link to="/how-it-works" className="btn ps-btn-ghost btn-lg">See how it works</Link>
            </div>
            <ul className="ps-hero-facts">
              <li><b>6</b> calculators</li>
              <li><b>2D + 3D</b> roof studio</li>
              <li><b>Precision-rated</b> photo measuring</li>
            </ul>
          </div>
          <div className="ps-hero-visual"><WallElevation /></div>
        </div>
      </section>
      <Ruler dark />

      {/* 2. CHALLENGES */}
      <section className="ps-section">
        <div className="ps-container">
          <Sheet no="A-01" kicker="The problem" title={<>The estimate that passes through <span className="ps-accent">five tools</span>.</>}
            lead="Notebook, phone calculator, spreadsheet, drawing app, WhatsApp. Every hand-off between them is a place a number can drift." />
          <ol className="ps-chain" aria-label="How an estimate usually travels">
            {['Notebook', 'Calculator', 'Spreadsheet', 'Drawing', 'WhatsApp'].map((t, i) => (
              <li key={t}><span className="ps-chain-no">{i + 1}</span>{t}{i < 4 && <span className="ps-chain-gap" aria-hidden="true">≠</span>}</li>
            ))}
          </ol>
          <div className="ps-problems">
            {PROBLEMS.map((p) => (
              <article key={p.title} className="ps-problem"><h3>{p.title}</h3><p>{p.text}</p></article>
            ))}
          </div>
          <p className="ps-answer"><Glyph name="link" /> <span><b>PhentiBuild keeps it as one record</b> — measured, calculated, priced and exported in the same place.</span></p>
        </div>
      </section>

      {/* 3. FEATURES */}
      <section className="ps-section ps-section--muted">
        <div className="ps-container">
          <Sheet no="A-02" kicker="The toolkit" title="Seven tools. One project file." lead="Each tool works on its own, and they all share the same data." />
          <div className="ps-tools">
            {TOOLS.map((t) => (
              <Link key={t.id} to={`/features#${t.id}`} className="ps-tool">
                <span className="ps-tool-ref">{t.ref}</span>
                <span className="ps-tool-icon"><Glyph name={t.icon} /></span>
                <h3>{t.title}</h3>
                <p>{t.short}</p>
                <span className="ps-tool-more">Detail <Glyph name="arrow" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section className="ps-section">
        <div className="ps-container">
          <Sheet no="A-03" kicker="How it works" title="Six steps from project to BOQ." />
          <ol className="ps-steps ps-steps--compact">
            {STEPS.map((s) => (
              <li key={s.no} className="ps-step"><span className="ps-step-no">{s.no}</span><h3>{s.title}</h3><p>{s.text}</p></li>
            ))}
          </ol>
          <p className="ps-center"><Link to="/how-it-works" className="ps-link">Walk through it step by step <Glyph name="arrow" /></Link></p>
        </div>
      </section>

      {/* 5. WHO IT'S FOR */}
      <section className="ps-section ps-section--dark ps-grid-dark">
        <div className="ps-container">
          <Sheet dark no="A-04" kicker="Who it’s for" title="Built for the people who build." />
          <div className="ps-audiences">
            {AUDIENCES.map((a) => (
              <Link key={a.id} to={`/solutions#${a.id}`} className="ps-audience">
                <Glyph name={a.icon} />
                <h3>{a.title}</h3>
                <p>{a.line}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 6. PRODUCT PREVIEW */}
      <section className="ps-section">
        <div className="ps-container">
          <Sheet no="A-05" kicker="Inside the app" title="A live Bill of Quantities, priced as you work." lead="This is the real PhentiBuild BOQ — not an illustration." />
          <ProductShot src="/assets/marketing/boq.png" alt="The PhentiBuild Bill of Quantities with category subtotals, contingency and grand total"
            notes={[
              { x: 26, y: 30, text: 'Filter by project' },
              { x: 64, y: 54, text: 'Quantities, waste and prices edit in place' },
              { x: 82, y: 88, text: 'Contingency and grand total in GH₵' },
            ]} />
        </div>
      </section>

      {/* 7. BENEFITS */}
      <section className="ps-section ps-section--muted">
        <div className="ps-container">
          <Sheet no="A-06" kicker="Why PhentiBuild" title="Less guesswork. More confidence." />
          <div className="ps-benefits">
            {BENEFITS.map((b) => (
              <article key={b.title} className="ps-benefit"><Glyph name={b.icon} /><div><h3>{b.title}</h3><p>{b.text}</p></div></article>
            ))}
          </div>
        </div>
      </section>

      {/* 8. FAQ */}
      <section className="ps-section">
        <div className="ps-container ps-narrow">
          <Sheet no="A-07" kicker="Questions" title="Frequently asked." align="center" />
          <FaqList items={faqs} />
          <p className="ps-center"><Link to="/faq" className="ps-link">All questions <Glyph name="arrow" /></Link></p>
        </div>
      </section>

      {/* 9. CTA */}
      <CtaBand />
    </>
  )
}
