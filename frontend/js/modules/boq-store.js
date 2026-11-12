/**
 * PhentiBuild (PhB) - Bill of Quantities Store
 *
 * Talks to backend/api/boq/index.php over fetch() — no localStorage here
 * any more. Every method is async and returns a plain result object
 * rather than throwing, matching every other store's {ok, ...}
 * convention. adjustedQuantity/total are computed server-side (see
 * BoqItem::cast in the backend) and returned ready to use, so this file
 * doesn't duplicate that math — boq.js's own live recompute while typing
 * still happens purely in the DOM, ahead of the network round-trip.
 *
 * The contingency percentage is a per-device display preference, not
 * part of the bill itself, so it deliberately stays in localStorage
 * rather than moving to the backend with the line items.
 *
 * update()'s `silent` flag still suppresses the subscriber notification
 * (and the full re-render it triggers) for inline table-cell edits —
 * boq.js doesn't await that call at all, so the request completes in the
 * background without disrupting whatever the user is doing next.
 */
(function () {
    'use strict';

    var API_URL = '/PhentiBuild/backend/api/boq/index.php';
    var CONTINGENCY_KEY = 'phb.boq.contingency.v1';
    var DEFAULT_CONTINGENCY_PERCENT = 5;

    var subscribers = [];
    function notify() { subscribers.forEach(function (fn) { fn(); }); }
    function subscribe(fn) { subscribers.push(fn); }

    function hydrate(row) {
        return {
            id: row.id,
            item: row.item,
            category: row.category,
            description: row.description || '',
            specification: row.specification || '',
            unit: row.unit,
            quantity: row.quantity,
            wastePercent: row.waste_percent,
            unitPrice: row.unit_price,
            adjustedQuantity: row.adjusted_quantity,
            total: row.total,
            notes: row.notes || '',
            source: row.source || 'manual',
            updatedAt: row.updated_at ? new Date(row.updated_at.replace(' ', 'T')) : new Date()
        };
    }

    async function request(method, query, body) {
        var url = API_URL + (query ? '?' + query : '');
        var options = { method: method, headers: { 'Accept': 'application/json' } };
        if (body !== undefined) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }

        var response;
        try {
            response = await fetch(url, options);
        } catch (networkError) {
            return { ok: false, network: true, error: 'Could not reach the server. Check your connection and try again.' };
        }

        var payload = null;
        try { payload = await response.json(); } catch (parseError) { /* no/invalid body */ }

        if (!response.ok) {
            return {
                ok: false,
                status: response.status,
                notFound: response.status === 404,
                error: (payload && payload.error) || 'The server returned an unexpected error (' + response.status + ').',
                errors: (payload && payload.errors) || null
            };
        }

        return { ok: true, body: payload };
    }

    async function getAll() {
        var result = await request('GET', null);
        if (!result.ok) { return result; }
        return { ok: true, items: result.body.data.map(hydrate) };
    }

    async function getById(id) {
        var result = await request('GET', 'id=' + encodeURIComponent(id));
        if (!result.ok) { return result; }
        return { ok: true, item: hydrate(result.body.data) };
    }

    async function add(data) {
        var result = await request('POST', null, data);
        if (!result.ok) { return result; }
        notify();
        return { ok: true, item: hydrate(result.body.data) };
    }

    /** Adds several line items one at a time (there is no batch endpoint —
     *  a calculator's "Add to BOQ" push is at most 2-3 items, so a small
     *  handful of sequential requests is simpler than a special batch
     *  route). Stops and reports the first failure; anything already
     *  created before that point stays created. */
    async function addMany(rows) {
        var added = [];
        for (var i = 0; i < rows.length; i++) {
            var result = await request('POST', null, rows[i]);
            if (!result.ok) {
                if (added.length) { notify(); }
                return { ok: false, error: result.error, errors: result.errors, items: added.map(hydrate) };
            }
            added.push(result.body.data);
        }
        notify();
        return { ok: true, items: added.map(hydrate) };
    }

    async function update(id, data, silent) {
        var result = await request('PUT', 'id=' + encodeURIComponent(id), data);
        if (!result.ok) { return result; }
        if (!silent) { notify(); }
        return { ok: true, item: hydrate(result.body.data) };
    }

    async function remove(id) {
        var result = await request('DELETE', 'id=' + encodeURIComponent(id));
        if (!result.ok) { return result; }
        notify();
        return { ok: true };
    }

    var CALCULATOR_MAPPERS = {
        walls: function (input, result) {
            return [
                {
                    item: 'Sandcrete Block', category: 'Blocks',
                    description: 'Blocks for a wall ' + input.wallLength + 'm long x ' + input.wallHeight + 'm high.',
                    specification: input.blockLength + ' x ' + input.blockHeight + ' mm face',
                    unit: 'piece', quantity: result.blockCountDry, wastePercent: input.wastePercent || 0
                },
                {
                    item: 'Mortar (blockwork joints)', category: 'Other',
                    description: 'Mortar for laying the blockwork above. Break down into cement and sand using the Plastering calculator if a material-level split is needed.',
                    specification: '', unit: 'm³', quantity: result.mortarVolumeM3, wastePercent: 0
                }
            ];
        },
        plastering: function (input, result) {
            return [
                {
                    item: 'Portland Cement', category: 'Cement',
                    description: 'Cement for plastering ' + result.totalSurfaceAreaM2 + 'm² at ' + input.plasterThickness + input.plasterThicknessUnit + ' thick.',
                    specification: 'Mix ratio ' + input.mixRatioCement + ':' + input.mixRatioSand + ' (cement:sand)',
                    unit: 'm³', quantity: result.cementRequirementM3, wastePercent: input.wastePercent || 0
                },
                {
                    item: 'Plastering Sand', category: 'Sand',
                    description: 'Sand for plastering ' + result.totalSurfaceAreaM2 + 'm² at ' + input.plasterThickness + input.plasterThicknessUnit + ' thick.',
                    specification: 'Mix ratio ' + input.mixRatioCement + ':' + input.mixRatioSand + ' (cement:sand)',
                    unit: 'm³', quantity: result.sandRequirementM3, wastePercent: input.wastePercent || 0
                }
            ];
        },
        concrete: function (input, result) {
            var desc = input.elementType === 'slab'
                ? 'Concrete for a slab ' + result.totalVolumeM3 + 'm³.'
                : 'Concrete for ' + (input.quantity || 1) + ' column(s), ' + result.totalVolumeM3 + 'm³ total.';
            var spec = 'Mix ratio ' + input.cementParts + ':' + input.sandParts + ':' + input.aggregateParts + ' (cement:sand:aggregate)';
            return [
                { item: 'Portland Cement', category: 'Cement', description: desc, specification: spec, unit: 'm³', quantity: result.cementM3, wastePercent: input.wastePercent || 0 },
                { item: 'Concreting Sand', category: 'Sand', description: desc, specification: spec, unit: 'm³', quantity: result.sandM3, wastePercent: input.wastePercent || 0 },
                { item: 'Coarse Aggregate', category: 'Aggregate', description: desc, specification: spec, unit: 'm³', quantity: result.aggregateM3, wastePercent: input.wastePercent || 0 }
            ];
        },
        rebar: function (input, result) {
            var colDesc = 'Reinforcement for ' + (input.columnQuantity || 1) + ' column(s) of ' +
                input.columnLengthRebar + ' x ' + input.columnWidthRebar + input.columnLengthUnit + '.';
            return [
                {
                    item: 'Reinforcement Bar (Main Bars)', category: 'Rebar', description: colDesc,
                    specification: input.mainBarDiameter + ' mm diameter, ' + input.numberOfMainBars + ' bars per column',
                    unit: 'kg', quantity: result.mainBarTotalWeight, wastePercent: 0
                },
                {
                    item: 'Reinforcement Bar (Stirrups)', category: 'Rebar', description: colDesc,
                    specification: input.stirrupDiameter + ' mm diameter, ' + input.stirrupSpacing + ' mm spacing',
                    unit: 'kg', quantity: result.stirrupTotalWeight, wastePercent: 0
                }
            ];
        },
        timber: function (input, result) {
            var memberLabel = result.memberType.charAt(0).toUpperCase() + result.memberType.slice(1);
            return [{
                item: 'Timber ' + result.timberType, category: 'Timber',
                description: memberLabel + ' for a structure ' + input.structureLength + 'm x ' + input.structureWidth + 'm.',
                specification: result.crossSection.width + ' x ' + result.crossSection.thickness + ' mm, ' + input.timberLength + 'm lengths',
                unit: 'piece', quantity: result.numberOfPieces, wastePercent: input.wastePercent || 0
            }];
        },
        roofing: function (input, result) {
            var roofDesc = 'Roof ' + input.roofWidth + 'm wide x ' + input.roofSlopeLength + 'm slope length.';

            if (result.materialType === 'ibr' || result.materialType === 'selflock') {
                return [{
                    item: result.label, category: 'Roofing', description: roofDesc,
                    specification: result.effectiveCoverMm + ' mm effective cover, ' + result.overallWidthMm + ' mm overall, cut to ' + result.sheetLength + 'm',
                    unit: 'sheet', quantity: result.sheetCount, wastePercent: input.wastePercent || 0
                }];
            }
            if (result.materialType === 'eurotile') {
                return [
                    {
                        item: result.label, category: 'Roofing', description: roofDesc,
                        specification: result.exposureMm.width + ' x ' + result.exposureMm.length + ' mm installed exposure',
                        unit: 'piece', quantity: result.totalTiles, wastePercent: input.wastePercent || 0
                    },
                    {
                        item: 'Roofing Battens', category: 'Timber', description: 'Batten lines for ' + result.rows + ' tile rows above.',
                        specification: result.exposureMm.length + ' mm gauge',
                        unit: 'm', quantity: result.battenTotalLengthM, wastePercent: 0
                    }
                ];
            }
            if (result.materialType === 'shingles') {
                return [
                    {
                        item: result.label, category: 'Roofing', description: roofDesc,
                        specification: result.shingleSizeMm.length + ' x ' + result.shingleSizeMm.height + ' mm strip',
                        unit: 'bundle', quantity: result.bundles, wastePercent: input.wastePercent || 0
                    },
                    {
                        item: 'Roofing Underlay Board', category: 'Underlay', description: 'Underlay beneath ' + result.roofAreaM2 + 'm² of shingles above.',
                        specification: result.underlayBoardMm.width + ' x ' + result.underlayBoardMm.length + ' mm board',
                        unit: 'piece', quantity: result.underlayBoards, wastePercent: 0
                    }
                ];
            }
            return [];
        }
    };

    async function addFromCalculator(sourceType, input, result) {
        var mapper = CALCULATOR_MAPPERS[sourceType];
        if (!mapper) {
            return { ok: false, error: 'This calculator is not connected to the Bill of Quantities.' };
        }

        var rows = mapper(input, result).map(function (row) {
            return Object.assign({}, row, { source: sourceType, unitPrice: 0, notes: '' });
        });

        return addMany(rows);
    }

    function getContingencyPercent() {
        try {
            var raw = window.localStorage.getItem(CONTINGENCY_KEY);
            var value = raw !== null ? JSON.parse(raw) : null;
            return typeof value === 'number' ? value : DEFAULT_CONTINGENCY_PERCENT;
        } catch (e) {
            return DEFAULT_CONTINGENCY_PERCENT;
        }
    }

    function setContingencyPercent(value) {
        var parsed = parseFloat(value);
        try {
            window.localStorage.setItem(CONTINGENCY_KEY, JSON.stringify(isFinite(parsed) ? parsed : 0));
        } catch (e) { /* ignore — storage unavailable, value just won't persist */ }
    }

    window.PhB = window.PhB || {};
    window.PhB.boqStore = {
        getAll: getAll,
        getById: getById,
        add: add,
        addMany: addMany,
        update: update,
        remove: remove,
        addFromCalculator: addFromCalculator,
        getContingencyPercent: getContingencyPercent,
        setContingencyPercent: setContingencyPercent,
        subscribe: subscribe
    };
})();
