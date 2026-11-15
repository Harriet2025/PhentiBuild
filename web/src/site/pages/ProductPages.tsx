import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AUDIENCES, STEPS, TOOLS } from '../content'
import { Glyph, Sheet } from '../drawing'
import { Checklist, CtaBand, PageHero, ProductShot } from '../parts'

/** Scroll to #anchor after the page renders (HashRouter keeps anchors in location.hash of the route). */
function useAnchor() {
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }, [hash])
}

/* ------------------------------------------------------------------ Features */
export function FeaturesPage() {
  useAnchor()
  useEffect(() => { document.title = 'Features — PhentiBuild' }, [])
  return (
    <>
      <PageHero sheet="A-01" kicker="Features" title={<>Seven tools that share <span className="ps-accent">one project file</span>.</>}
        lead="Measure on site, calculate quantities, design the roof, build the BOQ and export it — each tool is useful on its own, and better together because they share the same data." >
        <nav className="ps-jump" aria-label="Jump to a tool">
          {TOOLS.map((t) => <a key={t.id} href={`#/features#${t.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(t.id)?.scrollIntoView({ behavior: 'smooth' }) }}>{t.ref} · {t.title}</a>)}
        </nav>
      </PageHero>

      {TOOLS.map((t, i) => (
        <section key={t.id} id={t.id} className={`ps-section ps-detail${i % 2 ? ' ps-section--muted' : ''}`}>
          <div className={`ps-container ps-detail-grid${t.shot ? '' : ' ps-detail-grid--solo'}${i % 2 ? ' is-flipped' : ''}`}>
            <div className="ps-detail-copy">
              <p className="ps-sheet-tag"><span className="ps-sheet-no">{t.ref}</span><span className="ps-sheet-rule" aria-hidden="true" /><span>Detail {i + 1} of {TOOLS.length}</span></p>
              <h2 className="ps-detail-title"><Glyph name={t.icon} />{t.title}</h2>
              <p className="ps-detail-lead">{t.long}</p>
              <Checklist items={t.points} />
            </div>
            {t.shot && <div className="ps-detail-media"><ProductShot src={t.shot} alt={`${t.title} in PhentiBuild`} /></div>}
          </div>
        </section>
      ))}

      <section className="ps-section ps-section--dark ps-grid-dark">
        <div className="ps-container">
          <Sheet dark no="A-01.8" kicker="Measure your way" title="Camera or keyboard — neither is second best." lead="Sites don’t always cooperate with a camera. Bad light, a missing marker, a measurement that must be exact: switch to Manual Input and you keep the same validated fields, unit conversion and calculators." />
          <div className="ps-twin">
            <article><Glyph name="camera" /><h3>Camera Scanner</h3><p>Photograph the timber or wall with the printed marker, tap the points, and check the length and its precision rating before anything is saved.</p></article>
            <article><Glyph name="calculator" /><h3>Manual Input</h3><p>Type dimensions in mm, cm, m, inches or feet across eight forms — walls, plastering, floor/slab, column, concrete, rebar, timber and roof.</p></article>
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  )
}

/* ------------------------------------------------------------------ How it works */
const UNDER_THE_HOOD = [
  { what: 'Wall', input: 'Length × Height', out: 'Area → Block count', text: 'Wall area is divided by the block’s face size plus a mortar-joint allowance to give a block count, with your waste percentage rounded in.' },
  { what: 'Slab', input: 'Length × Width × Thickness', out: 'Concrete volume', text: 'Volume is split into cement, sand and aggregate by your mix ratio, each shown as dry and final (with-waste) quantities.' },
  { what: 'Column', input: 'Dimensions + reinforcement', out: 'Concrete + rebar schedule', text: 'Column concrete follows the same mix split, while bar count, diameter and stirrup spacing produce a full steel weight schedule.' },
  { what: 'Roof', input: 'Footprint + pitch + spacing', out: 'Timber + roofing', text: 'Footprint, pitch and spacing set the rafter, purlin and batten counts; roof area and the sheet type (IBR, self-lock, tile, shingle) set the coverage.' },
]

export function HowItWorksPage() {
  useEffect(() => { document.title = 'How it works — PhentiBuild' }, [])
  return (
    <>
      <PageHero sheet="A-02" kicker="How it works" title={<>From a project to a <span className="ps-accent">priced BOQ</span> in six steps.</>}
        lead="Each step builds on the last, in the same platform — so nothing has to be copied from one tool to another." />
      <section className="ps-section">
        <div className="ps-container">
          <ol className="ps-steps ps-steps--full">
            {STEPS.map((s) => (
              <li key={s.no} className="ps-step"><span className="ps-step-no">{s.no}</span><div><h3>{s.title}</h3><p>{s.text}</p></div></li>
            ))}
          </ol>
        </div>
      </section>
      <section className="ps-section ps-section--muted">
        <div className="ps-container">
          <Sheet no="A-02.1" kicker="Under the hood" title="Turn dimensions into decisions." lead="Step 3 isn’t a black box. This is the shape of what happens to a few common inputs." />
          <div className="ps-flows">
            {UNDER_THE_HOOD.map((f) => (
              <article key={f.what} className="ps-flow">
                <h3>{f.what}</h3>
                <p className="ps-flow-line"><span>{f.input}</span><Glyph name="arrow" /><b>{f.out}</b></p>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
          <p className="ps-note-box">These flows show how PhentiBuild structures a calculation; they are not certified engineering standards. Always confirm quantities against the drawings, local building codes and a qualified engineer.</p>
        </div>
      </section>
      <section className="ps-section">
        <div className="ps-container">
          <Sheet no="A-02.2" kicker="Step 2 in practice" title="Measuring from a photo." lead="Lay the printed marker on the object, take the photo, tap the points. The app finds the marker and turns pixels into millimetres." />
          <ProductShot src="/assets/marketing/scanner.png" alt="The PhentiBuild Camera Scanner measuring a wall with the A4 marker sheet"
            notes={[{ x: 52, y: 40, text: 'Marker found — exact scale' }, { x: 30, y: 62, text: 'Tap or drag the corners' }, { x: 80, y: 30, text: 'Length, height and precision rating' }]} />
          <p className="ps-center"><a className="ps-link" href="/reference-card.html" target="_blank" rel="noopener">Print the markers <Glyph name="arrow" /></a></p>
        </div>
      </section>
      <CtaBand />
    </>
  )
}

/* ------------------------------------------------------------------ Solutions (who it's for) */
export function SolutionsPage() {
  useAnchor()
  useEffect(() => { document.title = 'Solutions — who PhentiBuild is for' }, [])
  return (
    <>
      <PageHero sheet="A-03" kicker="Solutions" title={<>One platform, <span className="ps-accent">six ways of working</span>.</>}
        lead="Whether you price jobs, run the site, measure quantities, draw roofs or are still learning, PhentiBuild fits the way you already work." />
      <section className="ps-section">
        <div className="ps-container ps-solutions">
          {AUDIENCES.map((a, i) => (
            <article key={a.id} id={a.id} className="ps-solution">
              <span className="ps-solution-no">{String(i + 1).padStart(2, '0')}</span>
              <Glyph name={a.icon} />
              <h2>{a.title}</h2>
              <p className="ps-solution-line">{a.line}</p>
              <Checklist items={a.uses} />
            </article>
          ))}
        </div>
        <p className="ps-center"><Link to="/features" className="ps-link">See every tool <Glyph name="arrow" /></Link></p>
      </section>
      <CtaBand />
    </>
  )
}
