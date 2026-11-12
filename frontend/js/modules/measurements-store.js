/**
 * PhentiBuild (PhB) - Measurements Store
 *
 * Talks to backend/api/measurements/index.php over fetch(). Manual
 * Input's forms (frontend/js/modules/manual-input.js) call add() from
 * their new "Save Measurement" button; getAll()/getById()/update()/
 * remove() exist for a future Measurements listing view, following the
 * same {ok, ...} convention as every other store in this app.
 */
(function () {
    'use strict';

    var API_URL = '/PhentiBuild/backend/api/measurements/index.php';

    var subscribers = [];
    function notify() { subscribers.forEach(function (fn) { fn(); }); }
    function subscribe(fn) { subscribers.push(fn); }

    function hydrate(row) {
        return {
            id: row.id,
            sectionType: row.section_type,
            label: row.label,
            values: row.values || {},
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

    async function getAll(sectionType) {
        var result = await request('GET', sectionType ? 'sectionType=' + encodeURIComponent(sectionType) : null);
        if (!result.ok) { return result; }
        return { ok: true, measurements: result.body.data.map(hydrate) };
    }

    async function getById(id) {
        var result = await request('GET', 'id=' + encodeURIComponent(id));
        if (!result.ok) { return result; }
        return { ok: true, measurement: hydrate(result.body.data) };
    }

    async function add(data) {
        var result = await request('POST', null, data);
        if (!result.ok) { return result; }
        notify();
        return { ok: true, measurement: hydrate(result.body.data) };
    }

    async function update(id, data) {
        var result = await request('PUT', 'id=' + encodeURIComponent(id), data);
        if (!result.ok) { return result; }
        notify();
        return { ok: true, measurement: hydrate(result.body.data) };
    }

    async function remove(id) {
        var result = await request('DELETE', 'id=' + encodeURIComponent(id));
        if (!result.ok) { return result; }
        notify();
        return { ok: true };
    }

    window.PhB = window.PhB || {};
    window.PhB.measurementsStore = {
        getAll: getAll,
        getById: getById,
        add: add,
        update: update,
        remove: remove,
        subscribe: subscribe
    };
})();
