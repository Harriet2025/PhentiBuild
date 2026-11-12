<?php
/**
 * PhentiBuild - Project Model
 *
 * All SQL for the projects table lives here, behind prepared statements
 * only — no query in this file is ever built by concatenating a value
 * into the SQL string. The numeric `id` is the API's lookup key; `ref`
 * (PHB-0001, PHB-0002, ...) is generated on create purely as a
 * human-readable label, mirroring the ref the frontend's own (still
 * localStorage-only) Projects module already uses for display.
 */
require_once __DIR__ . '/History.php';

final class Project
{
    private PDO $db;

    private const TYPES = ['Residential', 'Commercial', 'Industrial', 'Infrastructure', 'Institutional'];
    private const STATUSES = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Archived'];

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public static function validTypes(): array
    {
        return self::TYPES;
    }

    public static function validStatuses(): array
    {
        return self::STATUSES;
    }

    /**
     * @param array{status?:string,type?:string} $filters
     */
    public function all(array $filters = []): array
    {
        $sql = 'SELECT * FROM projects WHERE 1=1';
        $params = [];

        if (!empty($filters['status'])) {
            $sql .= ' AND status = :status';
            $params['status'] = $filters['status'];
        }
        if (!empty($filters['type'])) {
            $sql .= ' AND type = :type';
            $params['type'] = $filters['type'];
        }

        $sql .= ' ORDER BY updated_at DESC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return array_map([self::class, 'cast'], $stmt->fetchAll());
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM projects WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ? self::cast($row) : null;
    }

    /**
     * @param array $data Already validated by Validator — see api/projects/index.php.
     *
     * ref (PHB-0001, PHB-0002, ...) is derived from the row's own new id
     * once MySQL assigns it, not from scanning existing rows for the
     * current highest ref. Deriving it from id means it can never be
     * handed out twice — AUTO_INCREMENT keeps counting up even after a
     * delete, whereas a MAX(ref)-style scan would reissue a deleted
     * project's ref to the next one created. ref starts NULL (the unique
     * index permits any number of NULLs) for the brief moment between the
     * insert and the follow-up update that sets it from the real id.
     */
    public function create(array $data): array
    {
        $stmt = $this->db->prepare(
            'INSERT INTO projects (ref, name, client, contact, location, type, description, start_date, end_date, progress, status)
             VALUES (NULL, :name, :client, :contact, :location, :type, :description, :start_date, :end_date, 0, :status)'
        );
        $stmt->execute([
            'name' => $data['name'],
            'client' => $data['client'],
            'contact' => $data['contact'] ?? null,
            'location' => $data['location'],
            'type' => $data['type'],
            'description' => $data['description'] ?? '',
            'start_date' => $data['startDate'],
            'end_date' => $data['endDate'],
            'status' => 'Planning',
        ]);

        $id = (int) $this->db->lastInsertId();
        $ref = 'PHB-' . str_pad((string) $id, 4, '0', STR_PAD_LEFT);

        $update = $this->db->prepare('UPDATE projects SET ref = :ref WHERE id = :id');
        $update->execute(['ref' => $ref, 'id' => $id]);

        History::record($this->db, 'project', (string) $id, 'created', "Project $ref (\"{$data['name']}\") was created.", projectId: $id);

        return $this->find($id);
    }

    /**
     * Partial update — only the keys present in $data are changed.
     * Returns the updated row, or null if the id doesn't exist.
     */
    public function update(int $id, array $data): ?array
    {
        if ($this->find($id) === null) {
            return null;
        }

        $columnMap = [
            'name' => 'name',
            'client' => 'client',
            'contact' => 'contact',
            'location' => 'location',
            'type' => 'type',
            'description' => 'description',
            'startDate' => 'start_date',
            'endDate' => 'end_date',
            'progress' => 'progress',
            'status' => 'status',
        ];

        $sets = [];
        $params = ['id' => $id];
        foreach ($columnMap as $field => $column) {
            if (array_key_exists($field, $data)) {
                $sets[] = "$column = :$column";
                $params[$column] = $data[$field];
            }
        }

        if (empty($sets)) {
            return $this->find($id);
        }

        $sql = 'UPDATE projects SET ' . implode(', ', $sets) . ' WHERE id = :id';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        History::record($this->db, 'project', (string) $id, 'updated', 'Project #' . $id . ' was updated (' . implode(', ', array_keys($data)) . ').', $data, projectId: $id);

        return $this->find($id);
    }

    public function delete(int $id): bool
    {
        $existing = $this->find($id);
        $stmt = $this->db->prepare('DELETE FROM projects WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $deleted = $stmt->rowCount() > 0;

        if ($deleted && $existing !== null) {
            History::record($this->db, 'project', (string) $id, 'deleted', 'Project ' . $existing['ref'] . ' ("' . $existing['name'] . '") was deleted.');
        }

        return $deleted;
    }

    /** Normalises DB row types (progress as int, not a numeric string). */
    private static function cast(array $row): array
    {
        $row['id'] = (int) $row['id'];
        $row['progress'] = (int) $row['progress'];
        return $row;
    }
}
