import { Link, Navigate, useParams } from 'react-router-dom'
import { ActiveProjectPicker } from '../../components/ProjectPicker'
import { CalculatorForm, type FormSection } from '../calculators/CalculatorForm'
import { CALCULATORS } from '../calculators/config'

/**
 * Port of pages/modules/manual-input.php + js/modules/manual-input.js:
 * #/manual-input (chooser) and #/manual-input/<type> (one form).
 * Five forms also calculate (same engines as Calculators); Floor/Slab,
 * Column and Roof are validated and saved as measurements.
 */
const calc = (id: string) => CALCULATORS.find((c) => c.id === id)!

type Section = FormSection & { icon: string }

const SECTIONS: Section[] = [
  {
    id: 'walls', label: 'Walls & Masonry', calc: calc('walls'), fields: calc('walls').fields,
    desc: 'Blockwork wall dimensions and the size of the block being used.',
    note: 'Enter one wall at a time. Block length and height describe the face of a single block, not the wall.',
    icon: '<rect x="3" y="5" width="18" height="14" rx="1"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="9" y1="5" x2="9" y2="12"/><line x1="15" y1="12" x2="15" y2="19"/>',
  },
  {
    id: 'plastering', label: 'Plastering', calc: calc('plastering'), fields: calc('plastering').fields,
    desc: 'Wall area to be rendered and the thickness of the plaster coat.',
    note: 'Record each face separately when only one side of the wall is being finished.',
    icon: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M7 16l8-8"/><path d="M12 16l4-4"/>',
  },
  {
    id: 'slab', label: 'Floor / Slab',
    desc: 'Plan dimensions and thickness of a floor slab or concrete bed.',
    note: 'Break irregular floors into rectangles and enter each one separately.',
    icon: '<path d="M12 4l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 9v4"/><path d="M21 9v4"/>',
    fields: [
      { name: 'length', label: 'Length', kind: 'length', unit: 'm', min: 100, max: 500000, placeholder: 'e.g. 9' },
      { name: 'width', label: 'Width', kind: 'length', unit: 'm', min: 100, max: 500000, placeholder: 'e.g. 6' },
      { name: 'slabThickness', label: 'Slab Thickness', kind: 'length', unit: 'mm', min: 25, max: 2000, placeholder: 'e.g. 150' },
    ],
  },
  {
    id: 'column', label: 'Column',
    desc: 'Height and cross-section of a single structural column.',
    note: 'Height runs floor to soffit. Length, breadth and width all describe the cross-section, so on a square column they carry the same value.',
    icon: '<rect x="9" y="4" width="6" height="16"/><line x1="5" y1="4" x2="19" y2="4"/><line x1="5" y1="20" x2="19" y2="20"/>',
    fields: [
      { name: 'height', label: 'Height', kind: 'length', unit: 'm', min: 100, max: 100000, placeholder: 'e.g. 3' },
      { name: 'length', label: 'Length', kind: 'length', unit: 'mm', min: 25, max: 5000, placeholder: 'e.g. 450' },
      { name: 'breadth', label: 'Breadth', kind: 'length', unit: 'mm', min: 25, max: 5000, placeholder: 'e.g. 225' },
      { name: 'width', label: 'Width', kind: 'length', unit: 'mm', min: 25, max: 5000, placeholder: 'e.g. 225' },
    ],
  },
  {
    id: 'roof', label: 'Roof',
    desc: 'Plan size, pitch and framing spacings for a roof structure.',
    note: 'Roof length and width are the plan dimensions of the area covered, measured on the ground floor plan.',
    icon: '<path d="M2 12L12 4l10 8"/><path d="M5 12v7h14v-7"/><line x1="12" y1="4" x2="12" y2="19"/>',
    fields: [
      { name: 'roofLength', label: 'Roof Length', kind: 'length', unit: 'm', min: 100, max: 500000, placeholder: 'e.g. 12' },
      { name: 'roofWidth', label: 'Roof Width', kind: 'length', unit: 'm', min: 100, max: 500000, placeholder: 'e.g. 9' },
      { name: 'roofPitch', label: 'Roof Pitch', kind: 'pitch', unit: 'deg', placeholder: 'e.g. 30', hint: 'Choose the unit your drawing uses: degrees, percent fall, or rise per 12 of run.' },
      { name: 'rafterSpacing', label: 'Rafter Spacing', kind: 'length', unit: 'mm', min: 100, max: 3000, placeholder: 'e.g. 600' },
      { name: 'purlinSpacing', label: 'Purlin Spacing', kind: 'length', unit: 'mm', min: 100, max: 3000, placeholder: 'e.g. 900' },
      { name: 'roofType', label: 'Roof Type', kind: 'select', options: ['Gable', 'Hip', 'Shed / Mono-pitch', 'Gambrel', 'Mansard', 'Flat', 'Butterfly', 'Pyramid Hip'] },
    ],
  },
  {
    id: 'concrete', label: 'Concrete', calc: calc('concrete'), fields: calc('concrete').fields,
    desc: 'Concrete volume and material requirements for slabs or columns.',
    note: 'Enter slab dimensions OR column dimensions—not both. The calculator will handle each type.',
    icon: '<rect x="3" y="4" width="18" height="16" rx="1"/><line x1="7" y1="8" x2="7" y2="16"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="17" y1="8" x2="17" y2="16"/>',
  },
  {
    id: 'rebar', label: 'Rebar', calc: calc('rebar'), fields: calc('rebar').fields,
    desc: 'Reinforcing steel (rebar) quantity and weight for reinforced columns.',
    note: 'Enter main bar and stirrup details. The calculator will produce a steel schedule and total weight.',
    icon: '<rect x="3" y="7" width="18" height="10" rx="1"/><line x1="8" y1="3" x2="8" y2="21"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="16" y1="3" x2="16" y2="21"/>',
  },
  {
    id: 'timber', label: 'Timber', calc: calc('timber'), fields: calc('timber').fields,
    desc: 'Rafter, purlin and batten quantities for structural or carcassing timber.',
    note: 'Enter one member type and timber size at a time. A roof or floor with more than one member type needs a separate entry for each.',
    icon: '<rect x="3" y="6" width="18" height="5" rx="1"/><rect x="3" y="13" width="18" height="5" rx="1"/><line x1="8" y1="6" x2="8" y2="11"/><line x1="16" y1="13" x2="16" y2="18"/>',
  },
]

export function ManualInputPage() {
  const { type } = useParams()
  const section = type ? SECTIONS.find((s) => s.id === type) : undefined
  if (type && !section) return <Navigate to="/manual-input" replace />

  if (!section) {
    return (
      <div className="manual-input-module">
        <div className="module-header">
          <div>
            <span className="eyebrow">Data Capture</span>
            <h1>Manual Input</h1>
            <p className="text-secondary">Choose what you want to measure, then enter the dimensions by hand.</p>
          </div>
        </div>
        <div className="alert alert-info mi-intro">
          <span className="alert-icon">i</span>
          <div className="alert-body">
            <span className="alert-title">How these forms work</span>
            <span>Every measurement can be entered in mm, cm, m, inches or feet, and each entry is validated as you type. Walls, Plastering, Concrete, Rebar and Timber also calculate quantities; Floor / Slab, Column and Roof are checked and saved as measurements.</span>
          </div>
        </div>
        <div className="mi-chooser-grid">
          {SECTIONS.map((s) => (
            <Link key={s.id} to={`/manual-input/${s.id}`} className="mi-type-card">
              <span className="mi-type-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: s.icon }} />
              </span>
              <span className="mi-type-body">
                <span className="mi-type-title">{s.label}</span>
                <span className="mi-type-desc">{s.desc}</span>
                <span className="mi-type-meta">{s.fields.length} inputs</span>
              </span>
              <svg className="mi-type-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 5 16 12 9 19" /></svg>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="manual-input-module">
      <div className="mi-form-view">
        <nav className="breadcrumb">
          <Link to="/manual-input">Manual Input</Link>
          <span className="separator">/</span>
          <span className="is-current">{section.label}</span>
        </nav>
        <div className="module-header">
          <div>
            <span className="eyebrow">Manual Entry</span>
            <h1>{section.label}</h1>
            <p className="text-secondary">{section.desc}</p>
          </div>
          <div className="module-header-actions">
            <ActiveProjectPicker />
            <Link to="/manual-input" className="btn btn-outline-secondary btn-sm">Change type</Link>
          </div>
        </div>
        <CalculatorForm key={section.id} section={section} mode="manual" />
      </div>
    </div>
  )
}
