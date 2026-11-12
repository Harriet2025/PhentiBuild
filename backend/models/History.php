<?php
/**
 * PhentiBuild - History Model
 *
 * An append-only audit trail. record() is called internally by other
 * models (Project, Material, BoqItem, Measurement, Calculation,
 * RoofDesign, Report) right after their own create/update/delete
 * succeeds — never by the API layer directly, and there is deliberately
 * no update()/delete() here at all: a mutable audit log can't be trusted
 * as a record of what actually happened.
 *
 * Who did it and what it belonged to are captured automatically rather
 * than threaded through every call site:
 *   - user_id comes from the active session (core/session.php is always
 *     loaded by core/bootstrap.php, so phb_current_user_id() is always
 *     available inside a real request; it's guarded here anyway so a
 *     CLI script with no session never fatals).
 *   - module is derived from entity_type via MODULE_LABELS, so callers
 *     never have to keep a human label in sync themselves.
 *   - project_id is only meaningful for entity types that actually carry
 *     a project relationship in their own table (projects themselves,
 *     and reports) — every other entity type is a standalone collection
 *     with no project column, so it's simply left null for those, which
 *     is passed in explicitly by the one or two call sites that have it.
 */
final class History
{
    private PDO $db;

    private const ENTITY_TYPES = ['project', 'material', 'boq_item', 'measurement', 'calculation', 'roof_design', 'report', 'account', 'company_profile'];
    private const ACTIONS = ['created', 'updated', 'deleted', 'deactivated', 'reactivated'];

    private const MODULE_LABELS = [
        'project' => 'Projects',
        'material' => 'Materials',
        'boq_item' => 'BOQ',
        'measurement' => 'Measurements',
        'calculation' => 'Calculations',
        'roof_design' => 'Roof Designs',
        'report' => 'Reports',
        'account' => 'Settings',
        'company_profile' => 'Settings',
    ];

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public static function validEntityTypes(): array
    {
        return self::ENTITY_TYPES;
    }

    public static function validModules(): array
    {
        return array_values(self::MODULE_LABELS);
    }

    /**
     * Records one audit entry. Deliberately swallows its own failures
     * (logging server-side only) rather than throwing — a history-write
     * problem must never break the actual operation it's recording.
     */
    public static function record(
        PDO $db,
        string $entityType,
        string $entityId,
        string $action,
        string $summary,
        ?array $details = null,
        ?int $projectId = null
    ): void {
        if (!in_array($action, self::ACTIONS, true)) {
            return;
        }
        try {
            $userId = function_exists('phb_current_user_id') ? phb_current_user_id() : null;
            $module = self::MODULE_LABELS[$entityType] ?? null;

            $stmt = $db->prepare(
                'INSERT INTO history (entity_type, entity_id, user_id, project_id, module, action, summary, details_json)
                 VALUES (:entity_type, :entity_id, :user_id, :project_id, :module, :action, :summary, :details)'
            );
            $stmt->execute([
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'user_id' => $userId,
                'project_id' => $projectId,
                'module' => $module,
                'action' => $action,
                'summary' => $summary,
                'details' => $details !== null ? json_encode($details, JSON_UNESCAPED_SLASHES) : null,
            ]);
        } catch (Throwable $e) {
            error_log('[PhentiBuild History] Failed to record entry: ' . $e->getMessage());
        }
    }

    /**
     * @param array{entityType?:string,entityId?:string,module?:string,userId?:int,date?:string,q?:string} $filters
     */
    public function all(array $filters = [], int $limit = 100): array
    {
        $sql = 'SELECT h.*, u.name AS user_name, p.ref AS project_ref, p.name AS project_name
                FROM history h
                LEFT JOIN users u ON u.id = h.user_id
                LEFT JOIN projects p ON p.id = h.project_id
                WHERE 1=1';
        $params = [];

        if (!empty($filters['entityType'])) {
            $sql .= ' AND h.entity_type = :entity_type';
            $params['entity_type'] = $filters['entityType'];
        }
        if (!empty($filters['entityId'])) {
            $sql .= ' AND h.entity_id = :entity_id';
            $params['entity_id'] = $filters['entityId'];
        }
        if (!empty($filters['module'])) {
            $sql .= ' AND h.module = :module';
            $params['module'] = $filters['module'];
        }
        if (!empty($filters['userId'])) {
            $sql .= ' AND h.user_id = :user_id';
            $params['user_id'] = $filters['userId'];
        }
        if (!empty($filters['date'])) {
            $sql .= ' AND DATE(h.created_at) = :date';
            $params['date'] = $filters['date'];
        }
        if (!empty($filters['q'])) {
            // Native (non-emulated) prepares can't reuse one named
            // placeholder for multiple occurrences, so each gets its own
            // binding of the same value.
            $sql .= ' AND (h.summary LIKE :q1 OR u.name LIKE :q2 OR p.name LIKE :q3 OR p.ref LIKE :q4 OR h.entity_id LIKE :q5)';
            $needle = '%' . $filters['q'] . '%';
            $params['q1'] = $needle;
            $params['q2'] = $needle;
            $params['q3'] = $needle;
            $params['q4'] = $needle;
            $params['q5'] = $needle;
        }

        $sql .= ' ORDER BY h.created_at DESC, h.id DESC LIMIT ' . max(1, min(500, $limit));

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return array_map([self::class, 'cast'], $stmt->fetchAll());
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT h.*, u.name AS user_name, p.ref AS project_ref, p.name AS project_name
             FROM history h
             LEFT JOIN users u ON u.id = h.user_id
             LEFT JOIN projects p ON p.id = h.project_id
             WHERE h.id = :id LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ? self::cast($row) : null;
    }

    /** All registered users, for populating the History page's "User"
     *  filter — not a general-purpose users listing endpoint, just the
     *  minimal id/name pair this filter needs. */
    public function filterUsers(): array
    {
        $stmt = $this->db->query('SELECT id, name FROM users ORDER BY name');
        return array_map(function (array $row): array {
            return ['id' => (int) $row['id'], 'name' => $row['name']];
        }, $stmt->fetchAll());
    }

    private static function cast(array $row): array
    {
        $row['id'] = (int) $row['id'];
        $row['user_id'] = $row['user_id'] !== null ? (int) $row['user_id'] : null;
        $row['project_id'] = $row['project_id'] !== null ? (int) $row['project_id'] : null;
        $row['details'] = $row['details_json'] !== null ? json_decode($row['details_json'], true) : null;
        unset($row['details_json']);
        return $row;
    }
}
