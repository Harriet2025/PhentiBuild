/**
 * PhentiBuild (PhB) - Projects Store
 *
 * Talks to the real PHP/MySQL backend (backend/api/projects/index.php)
 * over fetch() — there is no localStorage or seed data here any more.
 * Every method is async and returns a plain result object rather than
 * throwing, matching the {ok, ...} convention already used by the other
 * stores in this app (see materials-store.js, boq-store.js):
 *
 *   {ok: true,  ...}                                   on success
 *   {ok: false, error, errors?, notFound?, network?}   on failure
 *
 * `network: true` marks a failure where the request never reached the
 * server at all (offline, DNS, connection refused) — callers use this to
 * show a different message ("check your connection") from a normal
 * server-side error or validation failure.
 *
 * The backend's row shape (snake_case dates, no camelCase) is normalised
 * to the shape the rest of the frontend already expects via hydrate().
 */
(function () {
    'use strict';

    var API_URL = '/PhentiBuild/backend/api/projects/index.php';

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
            ref: row.ref,
            name: row.name,
            client: row.client,
            contact: row.contact || '',
            location: row.location,
            type: row.type,
            description: row.description || '',
            startDate: row.start_date,
            endDate: row.end_date,
            progress: row.progress,
            status: row.status,
            createdAt: row.created_at ? new Date(row.created_at.replace(' ', 'T')) : null,
            updatedAt: row.updated_at ? new Date(row.updated_at.replace(' ', 'T')) : new Date()
        };
    }

    /**
     * Runs one API request and normalises every outcome (network failure,
     * non-2xx status, malformed body) into the same {ok, ...} shape so
     * every store method below can just build on this.
     */
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
            // A non-JSON body (e.g. a raw PHP fatal error page) still means
            // the request reached the server — treat it as a server error,
            // not a network failure, but never show the raw HTML to the user.
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
        return { ok: true, projects: result.body.data.map(hydrate) };
    }

    async function getById(id) {
        var result = await request('GET', 'id=' + encodeURIComponent(id));
        if (!result.ok) { return result; }
        return { ok: true, project: hydrate(result.body.data) };
    }

    /** Resolves a human-readable ref (from the #projects/PHB-0001 URL)
     *  to the full project, including its numeric id — the only place
     *  this store still has to search the list rather than querying
     *  directly, since the backend's single-resource routes take id. */
    async function getByRef(ref) {
        var all = await getAll();
        if (!all.ok) { return all; }

        var match = all.projects.filter(function (p) { return p.ref === ref; });
        if (!match.length) {
            return { ok: false, notFound: true, error: 'That project could not be found.' };
        }
        return { ok: true, project: match[0] };
    }

    async function add(data) {
        var result = await request('POST', null, data);
        if (!result.ok) { return result; }
        notify();
        return { ok: true, project: hydrate(result.body.data) };
    }

    async function update(id, data) {
        var result = await request('PUT', 'id=' + encodeURIComponent(id), data);
        if (!result.ok) { return result; }
        notify();
        return { ok: true, project: hydrate(result.body.data) };
    }

    function archive(id) {
        return update(id, { status: 'Archived' });
    }

    async function remove(id) {
        var result = await request('DELETE', 'id=' + encodeURIComponent(id));
        if (!result.ok) { return result; }
        notify();
        return { ok: true };
    }

    window.PhB = window.PhB || {};
    window.PhB.projectsStore = {
        getAll: getAll,
        getById: getById,
        getByRef: getByRef,
        add: add,
        update: update,
        archive: archive,
        remove: remove,
        subscribe: subscribe
    };
})();
