<?php
/**
 * PhentiBuild - Report Model
 *
 * Backend foundation only — there is no frontend to connect yet (see
 * backend/database/reports.sql). A report is a title/type/optional
 * project link plus a JSON content snapshot; real report generation is a
 * later stage.
 */
require_once __DIR__ . '/History.php';

final class Report
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    /**
     * @param array{projectId?:int} $filters
     */
    public function all(array $filters = []): array
    {
        $sql = 'SELECT * FROM reports WHERE 1=1';
        $params = [];

        if (!empty($filters['projectId'])) {
            $sql .= ' AND project_id = :project_id';
            $params['project_id'] = $filters['projectId'];
        }

        $sql .= ' ORDER BY created_at DESC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return array_map([self::class, 'cast'], $stmt->fetchAll());
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM reports WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ? self::cast($row) : null;
    }

    /** True if a project with this id actually exists — used to give a
     *  clear 422 instead of letting a bad projectId silently save as
     *  NULL or fail with an opaque foreign-key error. */
    public function projectExists(int $projectId): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM projects WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $projectId]);
        return (bool) $stmt->fetchColumn();
    }

    public function create(array $data): array
    {
        $stmt = $this->db->prepare(
            'INSERT INTO reports (title, type, project_id, content_json, notes)
             VALUES (:title, :type, :project_id, :content_json, :notes)'
        );
        $stmt->execute([
            'title' => $data['title'],
            'type' => $data['type'] ?? 'custom',
            'project_id' => $data['projectId'] ?? null,
            'content_json' => isset($data['content']) ? json_encode($data['content'], JSON_UNESCAPED_SLASHES) : null,
            'notes' => $data['notes'] ?? null,
        ]);

        $id = (int) $this->db->lastInsertId();
        History::record(
            $this->db, 'report', (string) $id, 'created',
            'Report "' . $data['title'] . '" was exported.',
            projectId: $data['projectId'] ?? null
        );

        return $this->find($id);
    }

    public function update(int $id, array $data): ?array
    {
        if ($this->find($id) === null) {
            return null;
        }

        $sets = [];
        $params = ['id' => $id];

        if (array_key_exists('title', $data)) { $sets[] = 'title = :title'; $params['title'] = $data['title']; }
        if (array_key_exists('type', $data)) { $sets[] = 'type = :type'; $params['type'] = $data['type']; }
        if (array_key_exists('projectId', $data)) { $sets[] = 'project_id = :project_id'; $params['project_id'] = $data['projectId']; }
        if (array_key_exists('notes', $data)) { $sets[] = 'notes = :notes'; $params['notes'] = $data['notes']; }
        if (array_key_exists('content', $data)) { $sets[] = 'content_json = :content_json'; $params['content_json'] = json_encode($data['content'], JSON_UNESCAPED_SLASHES); }

        if (empty($sets)) {
            return $this->find($id);
        }

        $sql = 'UPDATE reports SET ' . implode(', ', $sets) . ' WHERE id = :id';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        $updated = $this->find($id);
        History::record(
            $this->db, 'report', (string) $id, 'updated',
            'Report #' . $id . ' was updated (' . implode(', ', array_keys($data)) . ').', $data,
            projectId: $updated['project_id'] ?? null
        );

        return $updated;
    }

    public function delete(int $id): bool
    {
        $existing = $this->find($id);
        $stmt = $this->db->prepare('DELETE FROM reports WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $deleted = $stmt->rowCount() > 0;

        if ($deleted && $existing !== null) {
            History::record(
                $this->db, 'report', (string) $id, 'deleted',
                'Report "' . $existing['title'] . '" was deleted.',
                projectId: $existing['project_id'] ?? null
            );
        }

        return $deleted;
    }

    private static function cast(array $row): array
    {
        $row['id'] = (int) $row['id'];
        $row['project_id'] = $row['project_id'] !== null ? (int) $row['project_id'] : null;
        $row['content'] = $row['content_json'] !== null ? json_decode($row['content_json'], true) : null;
        unset($row['content_json']);
        return $row;
    }
}
