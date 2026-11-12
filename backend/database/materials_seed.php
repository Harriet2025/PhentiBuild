<?php
/**
 * PhentiBuild - Materials Seed Migration
 *
 * One-time CLI script (not a web endpoint — there is no .htaccess
 * protection needed since it isn't meant to be run more than once per
 * environment, but see the guard below regardless) that migrates the 22
 * reference materials the frontend used to ship as hardcoded localStorage
 * seed data into the real `materials` table, so connecting the frontend
 * to the backend doesn't make the catalog appear empty.
 *
 * Run once via: php backend/database/materials_seed.php
 */

require_once __DIR__ . '/../config/database.php';

$db = getDbConnection();

$existing = (int) $db->query('SELECT COUNT(*) FROM materials')->fetchColumn();
if ($existing > 0) {
    echo "materials table already has $existing row(s) — skipping seed to avoid duplicates.\n";
    exit(0);
}

$materials = [
    ['MAT-1001', 'Portland Cement (Ordinary)', 'Cement', '50kg bag', null, '500 x 300 x 100 mm (bag)', null, null, 'General-purpose ordinary Portland cement (OPC) for concrete, mortar, plaster and screed mixes.'],
    ['MAT-1002', 'Portland Cement (Rapid Hardening)', 'Cement', '50kg bag', null, '500 x 300 x 100 mm (bag)', null, null, 'Rapid-hardening Portland cement for fast-track pours and precast work where early strength gain is required.'],
    ['MAT-1003', 'River Sand (Fine / Plastering)', 'Sand', 'Ton', 'Fine grade, under 2 mm particle size', null, null, null, 'Washed fine sand for plastering, rendering and mortar mixes.'],
    ['MAT-1004', 'Pit Sand (Sharp / Concreting)', 'Sand', 'Ton', 'Sharp grade, up to 5 mm particle size', null, null, null, 'Sharp sand for concrete and blockwork mortar mixes.'],
    ['MAT-1005', 'Crushed Granite (19mm)', 'Aggregate', 'Ton', '19 mm nominal size', null, null, null, 'Coarse aggregate for structural concrete mixes.'],
    ['MAT-1006', 'Crushed Granite (10mm)', 'Aggregate', 'Ton', '10 mm nominal size', null, null, null, 'Coarse aggregate for thin slabs, screeds and precast units.'],
    ['MAT-1007', 'Sandcrete Block (450 x 225 x 225mm, solid)', 'Blocks', 'piece', '450 x 225 x 225 mm', '460 x 235 x 235 mm with mortar joint', '9 blocks per m² of wall face (10mm mortar joint)', null, 'Standard solid sandcrete block for load-bearing external and internal walls.'],
    ['MAT-1008', 'Sandcrete Block (450 x 225 x 150mm, solid)', 'Blocks', 'piece', '450 x 225 x 150 mm', '460 x 235 x 160 mm with mortar joint', '9 blocks per m² of wall face (10mm mortar joint)', null, 'Solid sandcrete block for internal partition walls.'],
    ['MAT-1009', 'Reinforcement Bar Y10 (10mm High Yield)', 'Rebar', '12m length', '10 mm diameter', null, null, '12 m', 'High-yield deformed reinforcement bar for stirrups, links and light reinforcement.'],
    ['MAT-1010', 'Reinforcement Bar Y16 (16mm High Yield)', 'Rebar', '12m length', '16 mm diameter', null, null, '12 m', 'High-yield deformed reinforcement bar for main column and beam reinforcement.'],
    ['MAT-1011', 'Timber 2 x 2', 'Timber', 'piece', '2 x 2 in (nominal)', '50 x 50 mm (actual)', null, '3.6 m (stock length)', 'Light general-purpose timber for battens and noggins.', '300–450 mm centres (battens)'],
    ['MAT-1012', 'Timber 2 x 3', 'Timber', 'piece', '2 x 3 in (nominal)', '50 x 75 mm (actual)', null, '3.6 m (stock length)', 'General carpentry timber for light framing and furring.', '400–600 mm centres'],
    ['MAT-1013', 'Timber 2 x 4', 'Timber', 'piece', '2 x 4 in (nominal)', '50 x 100 mm (actual)', null, '3.6 m (stock length)', 'Structural-grade carpentry timber for rafters, joists and studs.', '400–600 mm centres (rafters/joists)'],
    ['MAT-1014', 'Timber 2 x 6', 'Timber', 'piece', '2 x 6 in (nominal)', '50 x 150 mm (actual)', null, '3.6 m (stock length)', 'Heavier structural timber for longer-span rafters and floor joists.', '600 mm centres (rafters/joists)'],
    ['MAT-1015', 'Timber 4 x 4', 'Timber', 'piece', '4 x 4 in (nominal)', '100 x 100 mm (actual)', null, '3.6 m (stock length)', 'Heavy-section timber for structural posts and corner members.', 'Per design (structural posts)'],
    ['MAT-1016', 'IBR Long Span Roofing Sheet', 'Roofing', 'Metre run (cut to length)', 'Corrugated profile, 737 mm overall width', '737 mm overall width x custom length (cut to roof slope)', '686 mm effective cover width per sheet', 'Cut to order, up to 12 m', 'Long-span corrugated roofing sheet for industrial and residential roofs, fixed through the crown of the corrugation.', 'Max. 900 mm purlin spacing'],
    ['MAT-1017', 'Self-Lock Long Span Roofing Sheet', 'Roofing', 'Metre run (cut to length)', 'Trapezoidal profile, 410 mm overall width', '410 mm overall width x custom length (self-locking side lap, cut to roof slope)', '275-360 mm adjustable effective cover width per sheet (side lap can be tightened or opened)', 'Cut to order, up to 12 m', 'Concealed-fix long-span sheet with a self-locking side seam, leaving no exposed fasteners on the lap.', 'Max. 900 mm purlin spacing'],
    ['MAT-1018', 'Eurotile Roofing Sheet', 'Roofing', 'piece', 'Tile-profile pressed steel sheet, 1340 x 420 mm', '1340 x 420 mm actual tile size', '1290 x 370 mm installed exposure per tile', null, 'Pressed steel roofing sheet profiled to imitate overlapping clay tiles.', '370 mm batten gauge, 900 mm rafter spacing'],
    ['MAT-1019', 'Milano Roof Tile', 'Roofing', 'piece', 'Tile-profile pressed steel sheet, 1340 x 420 mm', '1340 x 420 mm actual tile size', '1290 x 370 mm installed exposure per tile', null, 'Interlocking tile-profile roofing sheet with a Mediterranean/Milano profile — same coverage spec as the Eurotile above.', '370 mm batten gauge, 900 mm rafter spacing'],
    ['MAT-1020', 'Asphalt Shingles', 'Roofing', 'Bundle', '1000 x 139 mm strip (5.5 x 39.3 in)', '1000 x 139 mm per strip', 'Approx. 3 bundles per 9.3 m² (100 sq ft) of roof; underlay boards required beneath at 1200 x 2400 mm each', null, 'Bitumen-based composite shingles for pitched residential roofs, laid over a solid marine/construction underlay board.', '145 mm weather exposure per course'],
    ['MAT-1021', 'Roofing Underlay (Synthetic Breathable Membrane)', 'Underlay', 'Roll', '1 m roll width', '1 m x 50 m roll', 'Approx. 45 m² effective coverage per roll (100mm side lap, 150mm end lap)', '50 m per roll', 'Breathable synthetic underlay providing a secondary weather barrier beneath roofing sheets or tiles.', '100 mm side lap, 150 mm end lap'],
    ['MAT-1022', 'Roofing Underlay (Bitumen Felt)', 'Underlay', 'Roll', '1 m roll width', '1 m x 10 m roll', 'Approx. 8 m² effective coverage per roll (100mm overlap)', '10 m per roll', 'Bitumen-saturated felt underlay for tiled and shingled roofs.', '100 mm overlap'],
];

$stmt = $db->prepare(
    'INSERT INTO materials (id, name, category, unit, dimensions, overall_dimensions, effective_coverage, standard_length, description, spacing)
     VALUES (:id, :name, :category, :unit, :dimensions, :overall_dimensions, :effective_coverage, :standard_length, :description, :spacing)'
);

foreach ($materials as $m) {
    $stmt->execute([
        'id' => $m[0], 'name' => $m[1], 'category' => $m[2], 'unit' => $m[3],
        'dimensions' => $m[4], 'overall_dimensions' => $m[5], 'effective_coverage' => $m[6],
        'standard_length' => $m[7], 'description' => $m[8], 'spacing' => $m[9] ?? null,
    ]);
}

echo 'Seeded ' . count($materials) . " materials.\n";
