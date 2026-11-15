/**
 * Website copy in one place, so Home and the inner pages always agree.
 * Every claim here describes what the app actually does today.
 */
export type Tool = { id: string; ref: string; icon: string; title: string; short: string; long: string; points: string[]; shot?: string }

export const TOOLS: Tool[] = [
  {
    id: 'calculators', ref: 'D1', icon: 'calculator', title: 'Construction calculators',
    short: 'Blocks, mortar, plaster, concrete, rebar, timber and roofing — with the working shown.',
    long: 'Six calculators built around the way estimates are actually done on Ghanaian sites. Enter dimensions in mm, cm, m, inches or feet; every result comes with the assumptions behind it, so you can check the method and not just trust a number.',
    points: ['Block & mortar, plaster, concrete (cement · sand · aggregate), rebar, timber, roofing', 'Unit conversion on every field; waste allowance where it matters', 'Send any result straight into the Bill of Quantities'],
    shot: '/assets/marketing/calculator.png',
  },
  {
    id: 'materials', ref: 'D2', icon: 'materials', title: 'Materials management',
    short: 'One shared catalogue of the blocks, cement, timber and sheets you really use.',
    long: 'A shared materials library with sizes, coverage and specifications, kept by your administrators so every estimate on the team uses the same units and the same specs.',
    points: ['Categories for blocks, cement, aggregate, rebar, timber, roofing and more', 'Deactivate items without losing history', 'Feeds sizes and coverage into the calculators'],
  },
  {
    id: 'boq', ref: 'D3', icon: 'boq', title: 'BOQ generation',
    short: 'A live Bill of Quantities that totals itself as you work.',
    long: 'Every saved calculation can become a BOQ line. Quantity, waste % and unit price stay editable in place, totals update by category, and a contingency gives you the grand total in GH₵.',
    points: ['Edit quantities and prices directly in the table', 'Category subtotals, contingency and grand total', 'Filter by project; one BOQ per job'],
    shot: '/assets/marketing/boq.png',
  },
  {
    id: 'roof', ref: 'D4', icon: 'roof', title: 'Roof design studio',
    short: 'Draw the roof plan in 2D, see the structure in 3D.',
    long: 'Sketch a footprint with lines, rectangles and polygons on a snapping grid, set the roof type, pitch, rafter and purlin spacing, and turn it into a rotatable 3D model of rafters, purlins, battens, ridge and hips — one design per project.',
    points: ['Gable, hip and hidden/flat roofs', 'Real-world coordinates, not pixels', 'Undo / redo and saved automatically'],
    shot: '/assets/marketing/roof.png',
  },
  {
    id: 'projects', ref: 'D5', icon: 'project', title: 'Project management',
    short: 'Every measurement, calculation and BOQ line filed under its project.',
    long: 'Create a project with its client, location, dates and status, and everything you capture can be linked to it. The project page brings its measurements, calculations, BOQ, roof design, reports and history together.',
    points: ['Progress, status and dates at a glance', 'Each person sees their own work; administrators see everyone’s', 'A full history of every change'],
    shot: '/assets/marketing/dashboard.png',
  },
  {
    id: 'scanner', ref: 'D6', icon: 'camera', title: 'Camera-assisted measurements',
    short: 'Photograph timber or a wall next to a printed marker and tap to measure.',
    long: 'Lay the printed PhentiBuild marker on the timber or tape it to the wall and take a photo. The app finds the marker, corrects for the camera angle and turns the points you tap into real lengths — with a precision rating, so you know how far to trust the number.',
    points: ['Free marker measuring — no AI key needed', 'Optional AI recognition places the points for you', 'Nothing is saved until you check it'],
    shot: '/assets/marketing/scanner.png',
  },
  {
    id: 'reports', ref: 'D7', icon: 'reports', title: 'Reports & exports',
    short: 'A real, editable Excel workbook — ready for a client or a supplier.',
    long: 'Export the project information, BOQ, materials and cement, rebar, timber and roofing schedules with a cost summary into one .xlsx workbook that opens in Excel and stays fully editable.',
    points: ['One workbook per project, or everything at once', 'Every export recorded in the project’s history', 'Works from the phone or the office'],
  },
]

export const STEPS = [
  { no: '01', title: 'Create the project', text: 'Add the job — client, location, dates — and choose it as the project you are working on. Everything you capture next is filed under it.' },
  { no: '02', title: 'Measure', text: 'Photograph the timber or wall with the printed marker and tap the points, or type dimensions in Manual Input. Both become the same measurement record.' },
  { no: '03', title: 'Calculate', text: 'Open the matching calculator with the sizes already filled in: blocks, plaster, concrete, rebar, timber or roofing — with the assumptions shown.' },
  { no: '04', title: 'Design the roof', text: 'Sketch the roof plan in Roof Studio and check the structure in 3D. The same pitch and spacing feed the timber and roofing estimates.' },
  { no: '05', title: 'Build the BOQ', text: 'Add results to the Bill of Quantities, set unit prices and waste, and watch the category totals and grand total update.' },
  { no: '06', title: 'Export & share', text: 'Download the Excel workbook for the client or the purchasing team. It is logged in the project history.' },
]

export const AUDIENCES = [
  { id: 'contractors', icon: 'hardhat', title: 'Contractors', line: 'Price jobs faster and with fewer surprises.', uses: ['Quick block, cement and roofing quantities for a quote', 'One BOQ per project with live totals', 'An Excel workbook to send with the quote'] },
  { id: 'site-managers', icon: 'site', title: 'Site managers', line: 'Capture the site as it really is.', uses: ['Measure timber and walls from a photo on site', 'Keep every measurement under the right project', 'See the project’s history at a glance'] },
  { id: 'quantity-surveyors', icon: 'clipboard', title: 'Quantity surveyors', line: 'Quantities you can check, line by line.', uses: ['Calculations that show their assumptions', 'Editable quantities, waste and rates', 'Category subtotals and contingency'] },
  { id: 'draftsmen', icon: 'compass', title: 'Draftsmen', line: 'From a roof plan to a roof structure.', uses: ['2D roof plans on a snapping grid', 'A 3D view of rafters, purlins and battens', 'Pitch and spacing kept with the drawing'] },
  { id: 'builders', icon: 'hammer', title: 'Builders', line: 'Know what to buy before you buy it.', uses: ['How many blocks, bags and sheets', 'Waste allowances built in', 'Works on the phone in your pocket'] },
  { id: 'students', icon: 'student', title: 'Construction students', line: 'Learn estimation by seeing the working.', uses: ['Every formula’s assumptions on show', 'Practise with your own dimensions', 'Free to create an account'] },
]

export const PROBLEMS = [
  { title: 'Numbers drift between tools', text: 'A wall is measured in a notebook, worked out on a phone calculator, typed into a spreadsheet and sent on WhatsApp. Every hand-off is a chance to copy a figure wrong.' },
  { title: 'Units get lost', text: 'Millimetres on the drawing, metres on site, feet from the supplier. One missed conversion and the cement order is off by a factor of ten.' },
  { title: 'Estimates go stale', text: 'Prices change and dimensions are corrected, but the old quantity is still sitting in last week’s spreadsheet.' },
  { title: 'Nobody can see the working', text: 'A total without its assumptions is hard to check, hard to trust and hard to defend to a client.' },
]

export const BENEFITS = [
  { icon: 'eye', title: 'Shows its working', text: 'Every calculation lists the assumptions behind it — mortar allowance, mix ratio, waste — so the number can be checked.' },
  { icon: 'ruler', title: 'Measures from a photo, honestly', text: 'A printed marker gives the photo a true scale; every measured length comes with a precision rating instead of false confidence.' },
  { icon: 'map', title: 'Built for how Ghana builds', text: 'Prices in GH₵, 450 × 225 blocks, IBR and self-lock long-span sheets — the materials on real Ghanaian sites.' },
  { icon: 'link', title: 'One record, site to spreadsheet', text: 'A measurement taken in the morning is already in the calculator, the BOQ and the Excel export by the afternoon.' },
  { icon: 'phone', title: 'Works on the phone in your pocket', text: 'Laid out for phones, tablets and laptops — no install, just open it in the browser.' },
  { icon: 'shield', title: 'Your work stays yours', text: 'Each person sees only their own projects and records; administrators manage access. Passwords are never stored in readable form.' },
]

export type Faq = { q: string; a: string }
export const FAQ_GROUPS: { title: string; items: Faq[] }[] = [
  { title: 'Calculations', items: [
    { q: 'How accurate are the calculations?', a: 'The calculators use standard estimating methods (block grids with mortar joints, mix-ratio splits for concrete and plaster, spacing-based timber counts). Each result lists its assumptions so you can check them. They are estimates for planning and pricing — always confirm critical quantities against the drawings, local building codes and a qualified engineer.' },
    { q: 'Can I use my own block sizes, mix ratios and waste?', a: 'Yes. Block sizes, mortar allowance, mix ratios, spacing and waste percentage are all inputs, and every length field accepts mm, cm, m, inches or feet.' },
    { q: 'How precise is the camera measuring?', a: 'It depends mostly on how big the marker is in the photo and how far the points you measure are from it. With the marker flat on the object and close to what you measure, our tests are typically within 1–2%; photographing a whole wall from far away is less precise. Every measurement gets a precision rating (high, medium or low), and the app warns you when the marker is too small or the points too far from it — use the A4 sheet for walls.' },
  ] },
  { title: 'Accounts', items: [
    { q: 'How do I create an account?', a: 'Choose Get Started and sign up with your email, or continue with your Google account. You’re taken straight to your dashboard.' },
    { q: 'What does my profession setting do?', a: 'It tells us whether you’re a contractor, site manager, quantity surveyor, draftsman or something else, so the platform can be shaped around your work. You can change it any time in Settings.' },
    { q: 'Who can be an administrator?', a: 'Administrator access is granted by the person running the PhentiBuild server, never through the website — so nobody can make themselves an admin.' },
  ] },
  { title: 'Projects', items: [
    { q: 'Can I link measurements and BOQ items to a project?', a: 'Yes. Pick the project under “Save to project” in Calculators, Manual Input or the Scanner, and new work is filed under it. Each project page shows its measurements, calculations, BOQ, roof design, reports and history.' },
    { q: 'What happens if I delete a project?', a: 'The project is removed, but the measurements, calculations, BOQ items and roof design linked to it are kept — they are simply no longer linked to a project.' },
  ] },
  { title: 'Data & storage', items: [
    { q: 'Where is my data stored?', a: 'In PhentiBuild’s database on its server. Each person sees only their own projects and records; administrators can see everyone’s to manage the account. See the Privacy Policy and Security page for details.' },
    { q: 'Are my photos stored?', a: 'Photos are used to measure and are not kept by PhentiBuild. If optional AI recognition is switched on, the photo is sent to the AI provider (Anthropic) for analysis.' },
    { q: 'Can I get my data out?', a: 'Yes — export your BOQ, materials and schedules to an editable Excel workbook at any time.' },
  ] },
  { title: 'Using the platform', items: [
    { q: 'Do I need to install anything?', a: 'No. PhentiBuild runs in the web browser on phones, tablets and computers.' },
    { q: 'Does it work offline?', a: 'Not yet — PhentiBuild needs an internet connection to save your work.' },
    { q: 'How much does it cost?', a: 'Plans are being finalised. There is no charge to create an account today — see the Pricing page for updates.' },
  ] },
]
