/**
 * PhentiBuild (PhB) - Materials Store
 *
 * Talks to the real PHP/MySQL backend (backend/api/materials/index.php)
 * over fetch() — no localStorage or seed data here any more (the 22
 * reference materials that used to be hardcoded here were migrated into
 * the database via backend/database/materials_seed.php). Every method is
 * async and returns a plain result object rather than throwing, matching
 * PhB.projectsStore's {ok, ...} convention:
 *
 *   {ok: true,  ...}                                   on success
 *   {ok: false, error, errors?, notFound?, network?}   on failure
 *
 * "Delete" is a soft deactivate on the server (is_active = 0) — a
 * material may already be referenced by past BOQ line items — so
 * remove() here calls the same endpoint the backend exposes for that,
 * not a row removal.
 */
(function () {
    'use strict';

    var API_URL = '/PhentiBuild/backend/api/materials/index.php';

    var subscribers = [];

    function notify() {
        subscribers.forEach(function (fn) { fn(); });
    }

    function subscribe(fn) {
        subscribers.push(fn);
    }

    function hydrate(row) {
        return {
            id: row.id,
            name: row.name,
            category: row.category,
            unit: row.unit,
            dimensions: row.dimensions,
            overallDimensions: row.overall_dimensions,
            effectiveCoverage: row.effective_coverage,
            standardLength: row.standard_length,
            spacing: row.spacing,
            description: row.description || '',
            isActive: !!row.is_active,
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
        try {
            payload = await response.json();
        } catch (parseError) {
            // A non-JSON body still means the request reached the server —
            // treat as a server error, not a network failure.
        }

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
        return { ok: true, materials: result.body.data.map(hydrate) };
    }

    async function getById(id) {
        var result = await request('GET', 'id=' + encodeURIComponent(id));
        if (!result.ok) { return result; }
        return { ok: true, material: hydrate(result.body.data) };
    }

    async function add(data) {
        var result = await request('POST', null, data);
        if (!result.ok) { return result; }
        notify();
        return { ok: true, material: hydrate(result.body.data) };
    }

    async function update(id, data) {
        var result = await request('PUT', 'id=' + encodeURIComponent(id), data);
        if (!result.ok) { return result; }
        notify();
        return { ok: true, material: hydrate(result.body.data) };
    }

    async function remove(id) {
        var result = await request('DELETE', 'id=' + encodeURIComponent(id));
        if (!result.ok) { return result; }
        notify();
        return { ok: true, material: hydrate(result.body.data) };
    }

    window.PhB = window.PhB || {};
    window.PhB.materialsStore = {
        getAll: getAll,
        getById: getById,
        add: add,
        update: update,
        remove: remove,
        subscribe: subscribe
    };
})();
