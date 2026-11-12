/**
 * PhentiBuild (PhB) - Calculations Store
 *
 * Talks to backend/api/calculations/index.php over fetch(). Manual
 * Input's calculator results panels call add() from their new "Save
 * Calculation" button, passing the same {input, result} pair the
 * "Add to Bill of Quantities" button already reuses (manual-input.js's
 * `lastCalculation`) — this just gives that pair a permanent record
 * instead of discarding it on the next run or page reload.
 */
(function () {
    'use strict';

    var API_URL = '/PhentiBuild/backend/api/calculations/index.php';

    var subscribers = [];
    function notify() { subscribers.forEach(function (fn) { fn(); }); }
    function subscribe(fn) { subscribers.push(fn); }

    function hydrate(row) {
        return {
            id: row.id,
            calculationType: row.calculation_type,
            label: row.label,
            input: row.input || {},
            result: row.result || {},
            notes: row.notes,
            createdAt: row.created_at ? new Date(row.created_at.replace(' ', 'T')) : null,
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

    async function getAll(calculationType) {
        var result = await request('GET', calculationType ? 'calculationType=' + encodeURIComponent(calculationType) : null);
        if (!result.ok) { return result; }
        return { ok: true, calculations: result.body.data.map(hydrate) };
    }

    async function getById(id) {
        var result = await request('GET', 'id=' + encodeURIComponent(id));
        if (!result.ok) { return result; }
        return { ok: true, calculation: hydrate(result.body.data) };
    }

    async function add(data) {
        var result = await request('POST', null, data);
        if (!result.ok) { return result; }
        notify();
        return { ok: true, calculation: hydrate(result.body.data) };
    }

    async function update(id, data) {
        var result = await request('PUT', 'id=' + encodeURIComponent(id), data);
        if (!result.ok) { return result; }
        notify();
        return { ok: true, calculation: hydrate(result.body.data) };
    }

    async function remove(id) {
        var result = await request('DELETE', 'id=' + encodeURIComponent(id));
        if (!result.ok) { return result; }
        notify();
        return { ok: true };
    }

    window.PhB = window.PhB || {};
    window.PhB.calculationsStore = {
        getAll: getAll,
        getById: getById,
        add: add,
        update: update,
        remove: remove,
        subscribe: subscribe
    };
})();
